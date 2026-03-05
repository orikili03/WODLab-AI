import { User } from "../../models/User.js";
import { Workout } from "../../models/Workout.js";
import { movementCacheService } from "../MovementCacheService.js";
import type { FitnessLevel } from "../../models/User.js";
import type { WodProtocol } from "../WodAssemblyService.js";

// ─── Session Summary (derived from Workout history) ───────────────────────

export interface SessionSummary {
    /** Protocol used in this session */
    protocol?: WodProtocol;
    /** Movement family tags (e.g. "squat", "hinge", "pull") */
    patterns: string[];
    /**
     * G/W/M modalities — re-classified from the live movement library.
     * Never read from stale DB fields.
     */
    modalities: string[];
    /** Individual movement names as resolved for the athlete's level */
    movementNames: string[];
    /** How many hours ago this session was (relative to fetch date) */
    ageHours: number;
}

// ─── Hydrated Context (full coaching context, single DB round-trip) ───────

export interface HydratedContext {
    userId: string;
    fitnessLevel: FitnessLevel;
    goals: string[];
    /** History sorted newest-first (lowest ageHours first) */
    history: SessionSummary[];
    /** True when the athlete has no recorded history */
    isColdStart: boolean;
}

// ─── WodHydrationService ──────────────────────────────────────────────────

const LOOKBACK_HOURS = 5 * 24; // 5-day window
const MAX_HISTORY_FETCH = 10;   // hard cap on DB results

/**
 * WodHydrationService
 *
 * Single DB round-trip: fetches User + recent Workout history in a
 * single Promise.all. Re-classifies each workout's movement modalities
 * from the live in-memory library — never from stale DB values.
 *
 * The resulting HydratedContext is passed to all downstream scoring
 * and variance services so they incur zero additional DB cost.
 */
export class WodHydrationService {
    /**
     * Fetch and hydrate the full coaching context for a user.
     *
     * @param userId       The authenticated user's ID string
     * @param dateOverride Optional date override (used by seed scripts / tests)
     */
    async fetch(userId: string, dateOverride?: Date): Promise<HydratedContext> {
        const now = dateOverride ?? new Date();

        // ── Single Promise.all: user + workout history + live library ─────
        const [user, rawWorkouts, library] = await Promise.all([
            User.findById(userId).lean(),
            Workout.find({ userId })
                .sort({ _id: -1 })
                .limit(MAX_HISTORY_FETCH)
                .lean(),
            movementCacheService.getAll(),
        ]);

        // Cold start — no user found (shouldn't happen; route validates first)
        if (!user) {
            return {
                userId,
                fitnessLevel: "beginner",
                goals: [],
                history: [],
                isColdStart: true,
            };
        }

        // ── Build name → modality map from live library ───────────────────
        // Also map progression variants so resolved names are covered.
        const modalityMap = new Map<string, string>();
        for (const m of library) {
            modalityMap.set(m.name.toLowerCase(), m.modality);
            const doc = m as unknown as { progressions?: Array<{ variant: string }> };
            for (const prog of doc.progressions ?? []) {
                modalityMap.set(prog.variant.toLowerCase(), m.modality);
            }
        }

        // ── Build SessionSummary for each workout within the lookback window
        const history: SessionSummary[] = rawWorkouts
            .map((w) => {
                const ageHours = this.computeAgeHours(w.dateString, now);
                return { w, ageHours };
            })
            .filter(({ ageHours }) => ageHours <= LOOKBACK_HOURS)
            .map(({ w, ageHours }) => {
                const items = (w.wod?.movementItems ?? []) as Array<{
                    name: string;
                    family?: string;
                }>;

                // Patterns = movement family tags from each item
                const patterns = items
                    .map((item) => item.family)
                    .filter((f): f is string => Boolean(f));

                // Modalities re-classified from live library
                const modalities = [
                    ...new Set(
                        items
                            .map((item) => modalityMap.get(item.name.toLowerCase()))
                            .filter((mod): mod is string => Boolean(mod))
                    ),
                ];

                // Movement names for fatigue decay scoring
                const movementNames = items.map((item) => item.name);

                return {
                    protocol: w.wod?.type as WodProtocol | undefined,
                    patterns,
                    modalities,
                    movementNames,
                    ageHours,
                } satisfies SessionSummary;
            });

        return {
            userId,
            fitnessLevel: user.fitnessLevel as FitnessLevel,
            goals: (user.goals ?? []) as string[],
            history,
            isColdStart: history.length === 0,
        };
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    /**
     * Compute session age in hours from a "DD/MM/YYYY" dateString.
     * Uses calendar-day granularity (no time-of-day).
     */
    private computeAgeHours(dateString: string, now: Date): number {
        const parts = dateString?.split("/");
        if (!parts || parts.length !== 3) return 0;
        const [dd, mm, yyyy] = parts.map(Number);
        if (!dd || !mm || !yyyy) return 0;
        const sessionDate = new Date(yyyy, mm - 1, dd);
        return (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
    }
}

// Singleton export
export const wodHydrationService = new WodHydrationService();
