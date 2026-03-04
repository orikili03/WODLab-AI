import type { FilteredMovement } from "./MovementFilterService.js";
import type { HydratedContext } from "./scoring/WodHydrationService.js";

// ─── Variance Analysis Result ─────────────────────────────────────────────
export interface VarianceAnalysis {
    /** Movement families used recently — these should be deprioritized */
    recentFamilies: string[];
    /** Modalities used recently — for balancing G/W/M distribution */
    recentModalities: string[];
    /** Modality most underrepresented in recent history */
    suggestedModality: string | null;
    /** Number of recent workouts analyzed */
    lookbackCount: number;
}

/**
 * VarianceCheckerService
 *
 * Implements the CrossFit "Constantly Varied" principle:
 * - Derives variance from WodHydrationService context (zero extra DB cost)
 * - Identifies overused movement families (avoid squat→squat)
 * - Tracks modality balance (G/W/M) to suggest underrepresented areas
 * - Scores candidate movements by "freshness" for better variance
 *
 * NOTE: The legacy `analyze(userId)` method that hit the DB directly has been
 * removed. All callers must pass a pre-fetched `HydratedContext` from
 * `WodHydrationService` via `analyzeFromContext()`.
 */
export class VarianceCheckerService {

    /**
     * Derive a VarianceAnalysis from a pre-fetched HydratedContext.
     *
     * Zero-DB-cost: builds the same output as the old analyze() using the
     * already-hydrated history from WodHydrationService. The route fetches
     * the context once and passes it here — no second DB round-trip.
     */
    async analyzeFromContext(context: HydratedContext): Promise<VarianceAnalysis> {
        // Cold start — no history available
        if (context.isColdStart || context.history.length === 0) {
            return {
                recentFamilies: [],
                recentModalities: [],
                suggestedModality: null,
                lookbackCount: 0,
            };
        }

        // Sort newest-first (ascending ageHours = more recent) as a defensive
        // guard — callers should already provide newest-first, but this ensures
        // any future caller won't silently break the MethodistMatrix window.
        const history = [...context.history].sort((a, b) => a.ageHours - b.ageHours);

        // Union of all patterns and modalities across all sessions
        const recentFamilies = [
            ...new Set(history.flatMap((s) => s.patterns)),
        ];
        const recentModalities = [
            ...new Set(history.flatMap((s) => s.modalities)),
        ];

        // Count modality occurrences to find least-represented
        const modalityCounts: Record<string, number> = { G: 0, W: 0, M: 0 };
        for (const session of history) {
            for (const mod of session.modalities) {
                modalityCounts[mod] = (modalityCounts[mod] ?? 0) + 1;
            }
        }

        const sorted = Object.entries(modalityCounts).sort(([, a], [, b]) => a - b);
        const suggestedModality = sorted[0][0];

        return {
            recentFamilies,
            recentModalities,
            suggestedModality,
            lookbackCount: context.history.length,
        };
    }

    /**
     * Score and sort candidate movements by variance "freshness."
     * Movements from recently-used families get deprioritized.
     *
     * Returns the same list of movements, sorted best-first.
     */
    rankByVariance(
        candidates: FilteredMovement[],
        analysis: VarianceAnalysis
    ): FilteredMovement[] {
        const recentFamilySet = new Set(
            analysis.recentFamilies.map((f) => f.toLowerCase())
        );

        return [...candidates].sort((a, b) => {
            const familyA = (
                (a.movement as unknown as { family?: string }).family ?? ""
            ).toLowerCase();
            const familyB = (
                (b.movement as unknown as { family?: string }).family ?? ""
            ).toLowerCase();

            const aRecent = recentFamilySet.has(familyA) ? 1 : 0;
            const bRecent = recentFamilySet.has(familyB) ? 1 : 0;

            // Prioritize movements NOT in recent families
            if (aRecent !== bRecent) return aRecent - bRecent;

            // Tie-break: prioritize the suggested modality
            if (analysis.suggestedModality) {
                const modA = (a.movement as unknown as { modality: string }).modality;
                const modB = (b.movement as unknown as { modality: string }).modality;
                const aMatch = modA === analysis.suggestedModality ? 0 : 1;
                const bMatch = modB === analysis.suggestedModality ? 0 : 1;
                if (aMatch !== bMatch) return aMatch - bMatch;
            }

            return 0;
        });
    }
}

// Singleton export
export const varianceCheckerService = new VarianceCheckerService();
