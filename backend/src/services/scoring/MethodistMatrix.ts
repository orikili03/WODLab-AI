import type { Modality } from "../../models/Movement.js";
import type { HistoricalSession } from "./WodHydrationService.js";

// ─── Methodist Matrix Types ───────────────────────────────────────────────

/** Per-modality score adjustments to apply to candidate movements today */
export interface ModalityAdjustments {
    G: number; // Gymnastics bias
    W: number; // Weightlifting bias
    M: number; // Monostructural bias
    [key: string]: number; // index signature — allows use as Record<string, number>
}

// ─── Constants ────────────────────────────────────────────────────────────

/** If any modality exceeds this share of recent volume, apply a penalty */
const OVER_REPRESENTED_THRESHOLD = 0.6;
const OVER_REPRESENTED_PENALTY = -2.0;
const UNDER_REPRESENTED_BONUS = +2.0;

// ─── MethodistMatrix ──────────────────────────────────────────────────────

/**
 * MethodistMatrix
 *
 * Implements the "Constantly Varied" CrossFit principle at the modality level.
 * Analyzes the G/W/M distribution of the last 3 sessions and applies
 * ±2.0 score adjustments to steer today's WOD toward balance.
 *
 * Cold Start (empty history): returns zero adjustments — no bias.
 */
export class MethodistMatrix {
    /**
     * Compute per-modality score adjustments based on recent session history.
     * Uses only the 3 most recent sessions.
     */
    getAdjustments(history: HistoricalSession[]): ModalityAdjustments {
        const adjustments: ModalityAdjustments = { G: 0, W: 0, M: 0 };

        // Cold start or single session: no adjustment needed
        const recentSessions = history.slice(0, 3);
        if (recentSessions.length === 0) return adjustments;

        // ── Count total modality appearances across 3 sessions ─────────
        const counts: Record<Modality, number> = { G: 0, W: 0, M: 0 };
        let total = 0;

        for (const session of recentSessions) {
            for (const mod of session.modalities) {
                counts[mod] = (counts[mod] ?? 0) + 1;
                total++;
            }
        }

        if (total === 0) return adjustments;

        // ── Identify over-represented and least-represented modalities ──
        const modalities: Modality[] = ["G", "W", "M"];
        let minCount = Infinity;
        let underRep: Modality | null = null;

        for (const mod of modalities) {
            const share = counts[mod] / total;

            if (share > OVER_REPRESENTED_THRESHOLD) {
                adjustments[mod] = OVER_REPRESENTED_PENALTY;
            }

            if (counts[mod] < minCount) {
                minCount = counts[mod];
                underRep = mod;
            }
        }

        // Apply bonus to the least-represented modality (only if it's
        // not already receiving an over-representation penalty)
        if (underRep && adjustments[underRep] === 0) {
            adjustments[underRep] = UNDER_REPRESENTED_BONUS;
        }

        return adjustments;
    }

    /**
     * Return a human-readable summary of the matrix state for debug logging.
     */
    describe(history: HistoricalSession[]): string {
        const adj = this.getAdjustments(history);
        return `Methodist Matrix: G(${adj.G >= 0 ? "+" : ""}${adj.G}) W(${adj.W >= 0 ? "+" : ""}${adj.W}) M(${adj.M >= 0 ? "+" : ""}${adj.M})`;
    }
}

// Singleton export
export const methodistMatrix = new MethodistMatrix();
