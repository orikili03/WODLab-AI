import type { FilteredMovement } from "../MovementFilterService.js";
import type { HydratedContext } from "./WodHydrationService.js";
import { dailySeed, SeededRng } from "../../utils/seed.js";

// ─── Scored Movement ──────────────────────────────────────────────────────

export interface ScoredMovement {
    movement: FilteredMovement;
    score: number;
}

// ─── Scoring Constants ────────────────────────────────────────────────────

const PATTERN_PENALTY_PER = 1.3;
const PATTERN_PENALTY_CAP = 4.0;
const METHODIST_OVER_BIAS = -2.0; // over-represented modality (>60% share)
const METHODIST_UNDER_BIAS = 2.0; // least-represented modality
const METHODIST_OVER_THRESHOLD = 0.6;
const GOAL_BONUS_PER_MATCH = 1.0;
const GOAL_BONUS_MAX = 3.0;
const SKILL_BONUS_EXACT = 1.0;
const SKILL_BONUS_ADJACENT = 0.5;
// Top-N pool size for seeded pick
const PICK_POOL_SIZE = 8;

// ─── Goal → StimulusTag affinity table ───────────────────────────────────

const GOAL_TAG_AFFINITY: Record<string, string[]> = {
    "competition": ["strength", "power", "speed", "accuracy"],
    "health": ["endurance", "balance", "flexibility", "recovery"],
    "weight loss": ["engine", "endurance", "stamina"],
    "general fitness": ["strength", "endurance", "coordination", "balance"],
    "strength": ["strength", "power"],
    "muscle": ["strength", "power"],
    "endurance": ["endurance", "stamina", "engine"],
    "flexibility": ["flexibility", "balance"],
    "mobility": ["flexibility", "balance", "recovery"],
};

function goalTags(goals: string[]): Set<string> {
    const out = new Set<string>();
    for (const g of goals) {
        const key = g.toLowerCase();
        // Direct keyword match against affinity table
        for (const [affKey, tags] of Object.entries(GOAL_TAG_AFFINITY)) {
            if (key.includes(affKey) || affKey.includes(key)) {
                for (const t of tags) out.add(t);
            }
        }
    }
    return out;
}

// ─── MovementScorer ───────────────────────────────────────────────────────

/**
 * MovementScorer
 *
 * Multi-factor deterministic scoring engine. All score components are additive:
 *
 *  1. Fatigue decay     — penalises recently used movements  (-10 / -2 / -1 per 24h window)
 *  2. Pattern family    — penalises over-used movement families (-1.3/use, capped -4.0)
 *  3. Methodist Matrix  — balances G/W/M distribution over 3 sessions (±2.0)
 *  4. Goal alignment    — rewards movements matching athlete goals (+3.0 max)
 *  5. Skill calibration — rewards appropriate difficulty for fitness level (+1.0 max)
 *
 * No Math.random(). Seeded picks use FNV → LCG (src/utils/seed.ts).
 */
export class MovementScorer {

    // ─── Public API ───────────────────────────────────────────────────────

    /**
     * Score and sort all candidate movements, best-first.
     *
     * @param movements         Pre-filtered candidates from MovementFilterService
     * @param context           Pre-fetched HydratedContext
     * @param availableEquipment User's equipment (reserved for future load penalty)
     */
    rankCandidates(
        movements: FilteredMovement[],
        context: HydratedContext,
        _availableEquipment?: string[],
    ): ScoredMovement[] {
        const methodistBias = this.computeMethodistBias(context);
        const derivedGoalTags = goalTags(context.goals);

        const scored = movements.map((fm) => ({
            movement: fm,
            score: this.scoreMovement(fm, context, methodistBias, derivedGoalTags),
        }));

        // Sort descending — highest score first
        scored.sort((a, b) => b.score - a.score);
        return scored;
    }

    /**
     * Pick one movement from the ranked pool using a deterministic seeded RNG.
     * Applies dynamic in-workout collision penalties based on already selected movements.
     */
    pickOne(
        ranked: ScoredMovement[],
        usedNames: Set<string>,
        selected: FilteredMovement[],
        userId: string,
        salt: string,
        modality?: "G" | "W" | "M",
        allowRepeat: boolean = false,
        movementComplexity: "simple" | "moderate" | "advanced" = "moderate",
    ): FilteredMovement | null {
        // ── 1. Re-score and Filter pool ──────────────────────────────────
        // We re-score the pool to apply dynamic in-workout penalties (e.g. Locomotion collision)
        let pool = ranked
            .filter(({ movement: fm }) => {
                if (!allowRepeat && usedNames.has(fm.resolvedName)) return false;
                if (modality) {
                    const mod = (fm.movement as unknown as { modality: string }).modality;
                    if (mod !== modality) return false;
                }
                return this.passesComplexityFilter(fm, movementComplexity);
            })
            .map(item => {
                let dynamicScore = item.score;
                const candidateFamily = (item.movement.movement as any).family;

                // Anti-Pattern: In-workout family collision (e.g. two "carry" or "locomotion" movements)
                if (candidateFamily) {
                    const isLocomotion = candidateFamily === "carry" || candidateFamily === "locomotion";
                    for (const s of selected) {
                        const sFamily = (s.movement as any).family;
                        if (sFamily === candidateFamily) {
                            dynamicScore -= 10.0; // Huge penalty for exact family collision within same workout
                        } else if (isLocomotion && (sFamily === "carry" || sFamily === "locomotion")) {
                            dynamicScore -= 10.0; // Huge penalty for multiple traveling movements
                        }
                    }
                }

                return { ...item, dynamicScore };
            });

        if (pool.length === 0) return null;

        // Sort by dynamic score descending
        pool.sort((a, b) => b.dynamicScore - a.dynamicScore);

        // ── 2. Take top-N slice ───────────────────────────────────────────
        const topN = pool.slice(0, Math.min(PICK_POOL_SIZE, pool.length));

        // ── 3. Seeded deterministic pick ──────────────────────────────────
        const base = dailySeed(userId, salt);
        const mixedSeed = (base ^ (usedNames.size * 0x9e3779b9)) >>> 0;
        const rng = new SeededRng(mixedSeed);
        const idx = Math.floor(rng.next() * topN.length);
        const picked = topN[idx].movement;

        usedNames.add(picked.resolvedName);
        return picked;
    }

    // ─── Scoring ──────────────────────────────────────────────────────────

    private scoreMovement(
        fm: FilteredMovement,
        context: HydratedContext,
        methodistBias: Record<string, number>,
        derivedGoalTags: Set<string>,
    ): number {
        let score = 0;

        const movDoc = fm.movement as unknown as {
            modality: string;
            family?: string;
            difficulty?: string;
            stimulusTags?: string[];
        };

        // ── 1. Fatigue decay (exponential per 24h window + 7D strict cap) ─
        let last7DaysCount = 0;
        for (const session of context.history) {
            if (session.movementNames.includes(fm.resolvedName)) {
                const h = session.ageHours;
                if (h <= 24) score -= 20.0;
                else if (h <= 48) score -= 5.0;
                else if (h <= 72) score -= 2.0;

                if (h <= 168) last7DaysCount++; // 168 hours = 7 days
            }
        }

        // Anti-pattern: Bounding frequent exact repeats over a 7 day window
        if (last7DaysCount >= 2) {
            score -= 25.0; // Hard exile if appeared 2+ times recently
        }

        // ── 2. Pattern family penalty (capped at -4.0) ────────────────────
        const family = movDoc.family ?? "";
        if (family) {
            const instances = context.history.filter((s) =>
                s.patterns.includes(family)
            ).length;
            score -= Math.min(instances * PATTERN_PENALTY_PER, PATTERN_PENALTY_CAP);
        }

        // ── 3. Methodist Matrix bias ──────────────────────────────────────
        const modality = movDoc.modality;
        if (modality in methodistBias) {
            score += methodistBias[modality];
        }

        // ── 4. Goal alignment (+3.0 max) ──────────────────────────────────
        const tags = movDoc.stimulusTags ?? [];
        const matches = tags.filter((t) => derivedGoalTags.has(t.toLowerCase())).length;
        score += Math.min(matches * GOAL_BONUS_PER_MATCH, GOAL_BONUS_MAX);

        // ── 5. Skill calibration (+1.0 max) ──────────────────────────────
        const diff = movDoc.difficulty;
        const level = context.fitnessLevel;
        if (level === "beginner") {
            if (diff === "beginner") score += SKILL_BONUS_EXACT;
            else if (diff === "intermediate") score += SKILL_BONUS_ADJACENT;
        } else {
            // rx
            if (diff === "advanced" || diff === "elite") score += SKILL_BONUS_EXACT;
            else if (diff === "intermediate") score += SKILL_BONUS_ADJACENT;
        }

        return score;
    }

    // ─── Methodist Matrix ─────────────────────────────────────────────────

    /**
     * Compute per-modality bias by analysing G/W/M distribution
     * over the 3 most recent sessions.
     *
     * - Over-represented (share > 60%) → METHODIST_OVER_BIAS (-2.0)
     * - Least-represented              → METHODIST_UNDER_BIAS (+2.0)
     */
    private computeMethodistBias(context: HydratedContext): Record<string, number> {
        const bias: Record<string, number> = { G: 0, W: 0, M: 0 };

        const recentSessions = context.history.slice(0, 3);
        if (recentSessions.length === 0) return bias;

        const counts: Record<string, number> = { G: 0, W: 0, M: 0 };
        for (const s of recentSessions) {
            for (const mod of s.modalities) {
                if (mod in counts) counts[mod]++;
            }
        }

        const total = counts.G + counts.W + counts.M;
        if (total === 0) return bias;

        // Find least-represented modality
        const minCount = Math.min(counts.G, counts.W, counts.M);

        for (const mod of ["G", "W", "M"] as const) {
            const share = counts[mod] / total;
            if (share > METHODIST_OVER_THRESHOLD) {
                bias[mod] = METHODIST_OVER_BIAS;
            } else if (counts[mod] === minCount) {
                // Only apply the under-bias to one modality if there's a clear winner
                bias[mod] = METHODIST_UNDER_BIAS;
            }
        }

        return bias;
    }

    // ─── Complexity Filter ────────────────────────────────────────────────

    /**
     * Returns false if the movement is too complex for the given complexity level.
     *
     * - simple:   Strict block on ANY "advanced" or "elite" movement (Beginner tier safety)
     * - moderate: Block "elite" movements.
     * - advanced: No restrictions
     */
    private passesComplexityFilter(
        fm: FilteredMovement,
        complexity: "simple" | "moderate" | "advanced",
    ): boolean {
        if (complexity === "advanced") return true;

        const movDoc = fm.movement as unknown as {
            difficulty?: string;
        };
        const { difficulty } = movDoc;

        if (complexity === "moderate") {
            return difficulty !== "elite";
        }

        if (complexity === "simple") {
            return difficulty !== "advanced" && difficulty !== "elite";
        }

        return true;
    }
}

// Singleton export
export const movementScorer = new MovementScorer();
