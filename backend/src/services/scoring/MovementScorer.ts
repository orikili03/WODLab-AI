import type { FilteredMovement } from "../MovementFilterService.js";
import type { HydratedContext } from "./WodHydrationService.js";
import { methodistMatrix } from "./MethodistMatrix.js";
import { dailySeed, SeededRng } from "../../utils/seed.js";

// ─── Scoring Constants ────────────────────────────────────────────────────

/** Exact movement reused within the given hour window → penalty */
const DECAY_24H = -10.0; // Absolute ban for 24 hours (drops below floor)
const DECAY_48H = -2.0;
const DECAY_72H = -1.0;

/** Per pattern-instance penalty, summed across history sessions */
const PATTERN_PENALTY_PER_OCCURRENCE = -1.3;
/** Maximum total pattern penalty for any single movement */
const PATTERN_PENALTY_CAP = -4.0;

/** Score floor: movements below this score are excluded from the pool */
const SCORE_FLOOR = -5.0;

/** Maximum pool size for random pick (dynamic: capped by actual pool size) */
const MAX_POOL_SIZE = 8;

/** Minimum eligible movements before triggering fallback relaxation */
const FALLBACK_THRESHOLD = 3;

// SeededRng and dailySeed relocated to central utils/seed.ts

// ─── Difficulty tiers vs Fitness levels ───────────────────────────────────
const DIFFICULTY_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2, elite: 3 };
const FITNESS_TO_DIFFICULTY: Record<string, string> = {
    beginner: "beginner",
    scaled: "intermediate",
    rx: "advanced"
};

// ─── MovementScorer ───────────────────────────────────────────────────────

/**
 * MovementScorer
 *
 * Scores every eligible FilteredMovement using:
 * - Goal alignment bonuses
 * - Skill calibration bonuses
 * - Exponential recency decay penalties
 * - Pattern repetition penalties (capped)
 * - Methodist Matrix modality bias adjustments
 *
 * Then selects from the top-N dynamic pool using a daily deterministic seed —
 * no Math.random() in the core loop.
 */
export class MovementScorer {

    /**
     * Score and rank all candidates. Returns them sorted best-first.
     * Applies exponential decay, pattern cap, and Methodist Matrix.
     */
    rankCandidates(
        candidates: FilteredMovement[],
        context: HydratedContext,
        availableEquipment?: string[],
    ): Array<{ movement: FilteredMovement; score: number }> {
        // Pre-compute pattern frequency map across all history sessions
        const patternFreq = this.buildPatternFreq(context);

        // Pre-compute sets of recently used movement names (by age bucket)
        const used24h = this.buildUsedSet(context, 0, 24);
        const used48h = this.buildUsedSet(context, 24, 48);
        const used72h = this.buildUsedSet(context, 48, 72);

        // Methodist Matrix adjustments
        const matrixAdj = methodistMatrix.getAdjustments(context.history);

        const scored = candidates.map((fm) => ({
            movement: fm,
            score: this.scoreOne(fm, context, patternFreq, used24h, used48h, used72h, matrixAdj, availableEquipment),
        }));

        // Sort descending
        scored.sort((a, b) => b.score - a.score);
        return scored;
    }

    /**
     * Pick one movement from the top-N pool using today's deterministic seed.
     * Filters out movements below SCORE_FLOOR and already used names.
     *
     * If fewer than FALLBACK_THRESHOLD candidates remain, automatically retries
     * with relaxed penalties (FALLBACK_DECAY_FACTOR applied).
     */
    pickOne(
        ranked: Array<{ movement: FilteredMovement; score: number }>,
        usedNames: Set<string>,
        userId: string,
        salt: string = "",
        allowedModality?: string,
        isFallback = false
    ): FilteredMovement | null {
        // Drop the floor to -10 in fallback (allows 48h/72h penalties to pass)
        // BUT strictly prevents 24h penalties (which are now -10 + negative pattern penalties)
        const floor = isFallback ? SCORE_FLOOR * 2 : SCORE_FLOOR;

        const pool = ranked.filter(({ movement, score }) => {
            const name = movement.resolvedName.toLowerCase();
            if (usedNames.has(name)) return false;

            // STRICT BAN: Never allow a movement that used the 24h DECAY penalty
            if (score <= DECAY_24H) return false;

            if (score < floor) return false;
            if (allowedModality) {
                const mod = (movement.movement as unknown as { modality: string }).modality;
                if (mod !== allowedModality) return false;
            }
            return true;
        });

        if (pool.length === 0) return null;

        // Trigger fallback if pool is too small and we're not already in it
        if (!isFallback && pool.length < FALLBACK_THRESHOLD) {
            return this.pickOne(ranked, usedNames, userId, salt, allowedModality, true);
        }

        // Dynamic top-N slice — safe for tiny pools (e.g. jump-rope only)
        const topN = pool.slice(0, Math.min(MAX_POOL_SIZE, pool.length));

        const rng = new SeededRng(dailySeed(userId, salt) + usedNames.size);
        const chosen = rng.choice(topN);

        usedNames.add(chosen.movement.resolvedName.toLowerCase());
        return chosen.movement;
    }

    // ── Private Helpers ──────────────────────────────────────────────────

    private scoreOne(
        fm: FilteredMovement,
        context: HydratedContext,
        patternFreq: Map<string, number>,
        used24h: Set<string>,
        used48h: Set<string>,
        used72h: Set<string>,
        matrixAdj: Record<string, number>,
        availableEquipment?: string[]
    ): number {
        const mov = fm.movement as unknown as Record<string, unknown>;
        const name = (mov.name as string).toLowerCase();
        const modality = mov.modality as string;

        // IMovement uses stimulusTags (string[]) — e.g. "strength", "endurance"
        // These map to the "effects" concept in the scoring plan.
        const stimulusTags: string[] = Array.isArray(mov.stimulusTags)
            ? (mov.stimulusTags as string[])
            : [];

        // IMovement uses family (string | undefined) — e.g. "squat", "hinge"
        // This is the single movement "pattern" for penalty tracking.
        const family: string | undefined = typeof mov.family === "string"
            ? mov.family
            : undefined;

        // ── Movement Demand Level ──────────────────────────────────────────
        // NEW: use native difficulty if available, else fall back to inference
        const isLoaded = Boolean(mov.isLoaded);
        const hasProgressions = Array.isArray(mov.progressions) && (mov.progressions as unknown[]).length > 0;

        const nativeDifficulty = typeof mov.difficulty === "string" ? mov.difficulty : null;
        const inferredDifficulty = nativeDifficulty ?? (isLoaded ? "rx" : hasProgressions ? "scaled" : "beginner");

        let score = 0.0;

        // ── Goal alignment (via stimulusTags) ──────────────────────────
        if (context.goals.length > 0) {
            const primaryGoal = context.goals[0].toLowerCase();
            if (stimulusTags.map((t: string) => t.toLowerCase()).includes(primaryGoal)) {
                score += 3.0;
            }
        }
        // Broad utility bonus: movements covering multiple stimulus tags
        if (stimulusTags.length >= 2) score += 1.0;

        // ── Skill calibration (native diff vs user level) ─────────────────
        const userLevel = context.fitnessLevel;
        const idealDiff = FITNESS_TO_DIFFICULTY[userLevel] ?? "intermediate";

        const currentDiffRank = DIFFICULTY_RANK[inferredDifficulty] ?? 1;
        const idealDiffRank = DIFFICULTY_RANK[idealDiff] ?? 1;

        if (currentDiffRank === idealDiffRank) {
            score += 1.2; // Perfect match
        } else if (currentDiffRank < idealDiffRank) {
            score += 0.5; // Slightly easier is okay
        } else {
            // Over-challenging but passed filter? Small penalty
            score -= 1.0;
        }

        // ── Equipment match penalty (missing gear = -10.0) ──────────────
        if (availableEquipment) {
            const required = (mov.equipmentRequired as string[]) ?? [];
            if (required.length > 0) {
                const hasAll = required.every(eq => availableEquipment.includes(eq));
                if (!hasAll && !mov.bodyweightOnly) {
                    score -= 10.0;
                }
            }
        }

        // ── Recovery modality penalty ───────────────────────────────────
        if (modality === "recovery") score -= 2.5;

        // ── Weightlifting Minimum Viability Bonus ───────────────────────
        // To counter-act the sheer volume of bodyweight and cardio options,
        // we give a small natural bump to W movements to ensure they show up.
        if (modality === "W") score += 0.5;

        // ── Exponential recency decay ───────────────────────────────────
        if (used24h.has(name)) score += DECAY_24H;
        else if (used48h.has(name)) score += DECAY_48H;
        else if (used72h.has(name)) score += DECAY_72H;

        // ── Pattern frequency penalty (capped, via movement family) ─────
        let patternPenalty = 0.0;
        if (family) {
            const freq = patternFreq.get(family.toLowerCase()) ?? 0;
            patternPenalty += PATTERN_PENALTY_PER_OCCURRENCE * freq;
        }
        score += Math.max(patternPenalty, PATTERN_PENALTY_CAP);

        // ── Methodist Matrix modality bias ──────────────────────────────
        const modAdj = matrixAdj[modality as "G" | "W" | "M"];
        if (typeof modAdj === "number") score += modAdj;

        return score;
    }

    /** Build a frequency map of pattern occurrences across all history sessions */
    private buildPatternFreq(context: HydratedContext): Map<string, number> {
        const freq = new Map<string, number>();
        for (const session of context.history) {
            for (const pattern of session.patterns) {
                const key = pattern.toLowerCase();
                freq.set(key, (freq.get(key) ?? 0) + 1);
            }
        }
        return freq;
    }

    /** Build a set of movement names used within a given hour range */
    private buildUsedSet(
        context: HydratedContext,
        minHours: number,
        maxHours: number
    ): Set<string> {
        const set = new Set<string>();
        for (const session of context.history) {
            if (session.ageHours >= minHours && session.ageHours <= maxHours) {
                for (const name of session.movementNames) {
                    set.add(name.toLowerCase());
                }
            }
        }
        return set;
    }
}

// Singleton export
export const movementScorer = new MovementScorer();
