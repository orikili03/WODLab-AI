import type { FilteredMovement } from "./MovementFilterService.js";
import { movementScorer } from "./scoring/MovementScorer.js";
import { repTarget } from "./scoring/repTarget.js";
import type { HydratedContext } from "./scoring/WodHydrationService.js";
import { dailySeed, SeededRng } from "../utils/seed.js";
import type mongoose from "mongoose";

// ─── WOD Template Types ───────────────────────────────────────────────────
export type WodProtocol =
    | "AMRAP"
    | "EMOM"
    | "FOR_TIME"
    | "TABATA"
    | "DEATH_BY"
    | "21_15_9"
    | "LADDER"
    | "CHIPPER"
    | "INTERVAL"
    | "STRENGTH_SINGLE"
    | "STRENGTH_SETS"
    | "REST_DAY";

export type WodCategory = "sprint" | "metcon" | "long";
export type RepScheme = number[] | "MAX_REPS";

// ─── Structured Quantity & Load ───────────────────────────────────────────
export interface Quantity {
    value: number;
    unit: string;    // "reps" | "m" | "cal" | "sec"
}

export interface Load {
    value: number;
    unit: string;    // "kg" | "lb"
}

// ─── Movement Item (new structured format) ────────────────────────────────
export interface AssembledMovementItem {
    movementId?: mongoose.Types.ObjectId;
    family?: string;
    name: string;
    quantity: Quantity;
    load?: Load;
    isMaxReps: boolean;
}

// ─── Assembled WOD (core structure saved to DB) ───────────────────────────
export interface AssembledWod {
    type: string;
    protocol: WodProtocol;
    category: WodCategory;
    duration?: number;
    rounds?: number;
    movementItems: AssembledMovementItem[];
    ladderType?: "ascending" | "descending" | "pyramid";
    scoringType?: "AMRAP" | "FOR_TIME";
}

// ─── Generated Workout (full output from assembly) ────────────────────────
export interface GeneratedWorkout {
    wod: AssembledWod;
    equipmentPresetName?: string;
    equipmentUsed: string[];
}

// ─── Template Configuration ───────────────────────────────────────────────
interface TemplateConfig {
    movementCount: { min: number; max: number };
}

const TEMPLATES: Record<WodProtocol, TemplateConfig> = {
    AMRAP: { movementCount: { min: 3, max: 4 } },
    EMOM: { movementCount: { min: 2, max: 4 } },
    FOR_TIME: { movementCount: { min: 2, max: 4 } },
    TABATA: { movementCount: { min: 2, max: 3 } },
    DEATH_BY: { movementCount: { min: 1, max: 2 } },
    "21_15_9": { movementCount: { min: 2, max: 3 } },
    LADDER: { movementCount: { min: 1, max: 2 } },
    CHIPPER: { movementCount: { min: 4, max: 6 } },
    INTERVAL: { movementCount: { min: 2, max: 3 } },
    STRENGTH_SINGLE: { movementCount: { min: 1, max: 1 } },
    STRENGTH_SETS: { movementCount: { min: 1, max: 2 } },
    REST_DAY: { movementCount: { min: 0, max: 0 } },
};

// ─── Stimulus Metadata (static — frontend looks up by protocol type) ──────
interface StimulusMeta {
    energySystem: string;
    primaryStimulus: string;
    stimulusNote: string;         // exposed to frontend via static import, NOT saved to DB
}

export const STIMULUS_METADATA: Record<WodProtocol, StimulusMeta> = {
    AMRAP: {
        energySystem: "Glycolytic / Oxidative",
        primaryStimulus: "Sustained effort — manage the burn.",
        stimulusNote:
            "Maintain consistent pacing. Each round should take roughly the same time.",
    },
    EMOM: {
        energySystem: "Mixed / Neuromuscular",
        primaryStimulus: "Consistent performance under interval fatigue.",
        stimulusNote:
            "Each movement should be completable within the minute with rest.",
    },
    FOR_TIME: {
        energySystem: "Mixed",
        primaryStimulus: "Task completion under time pressure.",
        stimulusNote:
            "Push the pace but maintain form. Break sets strategically — don't go to failure early.",
    },
    TABATA: {
        energySystem: "Phosphagen",
        primaryStimulus: "Maximal power output, anaerobic capacity.",
        stimulusNote:
            "Max effort during 20s work intervals. The 10s rest is sacred — use every second.",
    },
    DEATH_BY: {
        energySystem: "Glycolytic",
        primaryStimulus: "Threshold management, mental grit.",
        stimulusNote:
            "Start smooth. The early minutes should feel easy. The challenge is in the later rounds.",
    },
    "21_15_9": {
        energySystem: "Phosphagen-Glycolytic",
        primaryStimulus: "High-intensity sprint, maximal turnover.",
        stimulusNote:
            "This is a sprint. Unbroken sets early, fast transitions. Aim for sub-10 minutes.",
    },
    LADDER: {
        energySystem: "Mixed",
        primaryStimulus: "Volume accumulated under fatigue.",
        stimulusNote:
            "Focus on smooth transitions. The volume builds quickly. Pace yourself.",
    },
    CHIPPER: {
        energySystem: "Aerobic-Glycolytic",
        primaryStimulus: "Stamina and mental resilience.",
        stimulusNote:
            "Chip away at the large sets. Don't look at the whole list — just the movement in front of you.",
    },
    INTERVAL: {
        energySystem: "Aerobic / Power",
        primaryStimulus: "Repeatability and recovery.",
        stimulusNote:
            "Focus on consistent effort across intervals. Round times should be repeatable.",
    },
    STRENGTH_SINGLE: {
        energySystem: "Phosphagen (Neuromuscular)",
        primaryStimulus: "Absolute strength development.",
        stimulusNote:
            "Focus on mechanics and absolute strength. Take full recovery between attempts.",
    },
    STRENGTH_SETS: {
        energySystem: "Phosphagen / Neuromuscular",
        primaryStimulus: "Positional strength and volume load.",
        stimulusNote:
            "Move the load with perfect form. Rest until you are fully ready for the next set.",
    },
    REST_DAY: {
        energySystem: "Recovery",
        primaryStimulus: "Homeostasis and adaptation.",
        stimulusNote:
            "Recovery is where the adaptation happens. Eat well and stay mobile.",
    },
};

// ─── RPE Intensity Guidance (static — frontend looks up by category) ──────
export const INTENSITY_GUIDANCE: Record<WodCategory, string> = {
    sprint: "RPE 9-10: Max effort — leave nothing in the tank.",
    metcon: "RPE 7-8: Hard but sustainable — 2 reps in reserve.",
    long: "RPE 6-7: Conversational pace — protect the back half.",
};

// ─── Deterministic Seed Helpers relocated to src/utils/seed.ts ────────────

// ─── Parsing Helpers (convert repTarget strings → structured objects) ─────

/**
 * Parses a repTarget distance string into a Quantity.
 * Examples: "200 m" → { value: 200, unit: "m" }
 *           "12/10 cal" → { value: 12, unit: "cal" }
 *           "30 sec" → { value: 30, unit: "sec" }
 *           "5-10-15 m" → { value: 5, unit: "m" } (takes the first number)
 */
function parseDistanceToQuantity(distance: string): Quantity {
    const trimmed = distance.trim().toLowerCase();

    // Handle "cal" ranges: "12/10 cal" → take first number
    if (trimmed.includes("cal")) {
        const numMatch = trimmed.match(/(\d+)/);
        return { value: numMatch ? parseInt(numMatch[1], 10) : 0, unit: "cal" };
    }

    // Handle "sec": "30 sec" → { value: 30, unit: "sec" }
    if (trimmed.includes("sec")) {
        const numMatch = trimmed.match(/(\d+)/);
        return { value: numMatch ? parseInt(numMatch[1], 10) : 0, unit: "sec" };
    }

    // Handle meters: "200 m", "5-10-15 m" → take first number
    if (trimmed.includes("m")) {
        const numMatch = trimmed.match(/(\d+)/);
        return { value: numMatch ? parseInt(numMatch[1], 10) : 0, unit: "m" };
    }

    // Fallback: try to parse a plain number
    const num = parseInt(trimmed, 10);
    return { value: isNaN(num) ? 0 : num, unit: "reps" };
}

/**
 * Parses a repTarget weight string into a Load.
 * Examples: "50 kg" → { value: 50, unit: "kg" }
 *           "135 lb" → { value: 135, unit: "lb" }
 *           "RPE 7-8 (moderate-heavy)" → null (not a numeric load)
 */
function parseWeightToLoad(weight: string): Load | null {
    const trimmed = weight.trim().toLowerCase();

    // RPE descriptors are not numeric loads
    if (trimmed.startsWith("rpe")) return null;

    const kgMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*kg$/);
    if (kgMatch) return { value: parseFloat(kgMatch[1]), unit: "kg" };

    const lbMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*lb$/);
    if (lbMatch) return { value: parseFloat(lbMatch[1]), unit: "lb" };

    return null;
}

// ─── WodAssemblyService ───────────────────────────────────────────────────

export class WodAssemblyService {
    /**
     * Assembles a complete GeneratedWorkout using the deterministic Coach Engine.
     *
     * @param movements   Pre-filtered + level-resolved candidates from MovementFilterService
     * @param category    WOD time domain: "sprint" | "metcon" | "long"
     * @param context     Pre-fetched HydratedContext from WodHydrationService
     * @param userId      User ID string — used for daily seed generation
     * @param availableEquipment Optional list of equipment the user has (used for scoring penalties)
     * @param presetName  Optional equipment preset label (cosmetic only)
     */
    async assemble(
        movements: FilteredMovement[],
        category: WodCategory,
        context: HydratedContext,
        userId: string,
        availableEquipment?: string[],
        presetName?: string,
        salt: string = "",
        dateOverride?: Date
    ): Promise<GeneratedWorkout> {
        // ── 1. Score all candidates with the Coach Brain ──────────────────
        const ranked = movementScorer.rankCandidates(movements, context, availableEquipment);
        const usedNames = new Set<string>();

        // ── 2. Select protocol + duration (deterministic seeded pick) ─────
        const { protocol, duration, ladderType, scoringType } =
            this.selectProtocolAndDuration(category, userId, context.workoutDuration, salt, dateOverride);

        const config = TEMPLATES[protocol];

        // ── 3. Pick movements per modality slot ──────────────────────────
        const selected: FilteredMovement[] = [];
        const targetCount = config.movementCount.max;

        // Always try to fill one slot per modality first (G/W/M balance)
        for (const modality of ["M", "G", "W"]) {
            if (selected.length >= targetCount) break;
            const pick = movementScorer.pickOne(ranked, usedNames, userId, salt, modality);
            if (pick) selected.push(pick);
        }

        // Fill any remaining slots with best-available across all modalities
        while (selected.length < config.movementCount.min) {
            const pick = movementScorer.pickOne(ranked, usedNames, userId, salt);
            if (!pick) break;
            selected.push(pick);
        }

        if (selected.length === 0) {
            throw new Error(
                "Coach Engine: No eligible movements after scoring. Relax equipment constraints."
            );
        }

        // ── 4. Build movementItems using modality-aware repTarget ─────────
        const movementItems: AssembledMovementItem[] = selected.map((fm) => {
            const prescription = repTarget(fm.movement, context.fitnessLevel);
            let reps = prescription.reps;

            // Protocol-specific rep overrides
            if (protocol === "LADDER") {
                if (reps > 0) {
                    if (fm.movement.name.toLowerCase().includes("double under") ||
                        fm.movement.name.toLowerCase().includes("jump rope")) {
                        reps = 10;
                    } else {
                        reps = 2; // Standard G/W start
                    }
                }
            } else if (protocol === "DEATH_BY") {
                if (reps > 0) reps = 1;
            }

            // ── Build structured quantity ──────────────────────────────────
            let quantity: Quantity;
            if (prescription.distance) {
                quantity = parseDistanceToQuantity(prescription.distance);
            } else {
                quantity = { value: reps, unit: "reps" };
            }

            // ── Build structured load ─────────────────────────────────────
            let load: Load | undefined;
            if (prescription.weight) {
                const parsed = parseWeightToLoad(prescription.weight);
                if (parsed) load = parsed;
            }

            // ── Extract movement metadata ─────────────────────────────────
            const movementDoc = fm.movement as unknown as Record<string, unknown>;
            const movementId = movementDoc._id as mongoose.Types.ObjectId | undefined;
            const family = typeof movementDoc.family === "string" ? movementDoc.family : undefined;

            return {
                movementId,
                family,
                name: fm.resolvedName,
                quantity,
                load,
                isMaxReps: false,
            };
        });
        // ── 5. Assemble WOD object ───────────────────────────────────────
        const wod: AssembledWod = {
            type: protocol,
            protocol,
            category,
            duration,
            rounds: protocol === "FOR_TIME" ? 1 : undefined,
            movementItems,
            ladderType,
            scoringType,
        };

        // ── 6. Build equipment metadata ───────────────────────────────
        const equipmentUsed = Array.from(
            new Set(
                selected.flatMap(
                    (fm) => (fm.movement as unknown as { equipmentRequired: string[] }).equipmentRequired ?? []
                )
            )
        );

        return {
            wod,
            equipmentPresetName: presetName,
            equipmentUsed,
        };
    }

    // ─── Protocol Dispatcher (seeded, deterministic) ──────────────────────
    private selectProtocolAndDuration(
        category: WodCategory,
        userId: string,
        preferredDuration: number,
        salt: string = "",
        dateOverride?: Date
    ): {
        protocol: WodProtocol;
        duration: number;
        ladderType?: "ascending" | "descending" | "pyramid";
        scoringType?: "AMRAP" | "FOR_TIME";
    } {
        const rng = new SeededRng(dailySeed(userId, salt, dateOverride));

        if (category === "sprint") {
            const options: Array<{ p: WodProtocol; w: number }> = [
                { p: "21_15_9", w: 25 },
                { p: "TABATA", w: 25 },
                { p: "FOR_TIME", w: 20 },
                { p: "STRENGTH_SINGLE", w: 15 },
                { p: "LADDER", w: 15 },
            ];
            const p = this.weightedPick(options, rng);
            return {
                protocol: p,
                duration: p === "TABATA" ? 4 : 7,
                ladderType: p === "LADDER" ? "ascending" : undefined,
                scoringType: p === "LADDER" ? "AMRAP" : "FOR_TIME",
            };
        }

        if (category === "metcon") {
            const options: Array<{ p: WodProtocol; w: number }> = [
                { p: "AMRAP", w: 24 },
                { p: "EMOM", w: 28 },
                { p: "FOR_TIME", w: 28 },
                { p: "DEATH_BY", w: 10 },
                { p: "LADDER", w: 10 },
            ];
            const p = this.weightedPick(options, rng);

            // Bias durations toward user's workoutDuration preference
            const durations = [8, 10, 12, 15, 18, 20];
            const preferred = preferredDuration || 15;
            const duration = durations.reduce((prev, curr) =>
                Math.abs(curr - preferred) < Math.abs(prev - preferred) ? curr : prev
            );
            return {
                protocol: p,
                duration,
                ladderType: p === "LADDER" ? "ascending" : undefined,
                scoringType: p === "LADDER" ? "AMRAP" : p === "FOR_TIME" ? "FOR_TIME" : "AMRAP",
            };
        }

        // Long / Aerobic
        const options: Array<{ p: WodProtocol; w: number }> = [
            { p: "CHIPPER", w: 30 },
            { p: "AMRAP", w: 20 },
            { p: "INTERVAL", w: 20 },
            { p: "STRENGTH_SETS", w: 15 },
            { p: "LADDER", w: 15 },
        ];
        const p = this.weightedPick(options, rng);
        const durations = [25, 30, 40];
        const duration = durations[Math.floor(rng.next() * durations.length)];
        const ladderVariants: Array<"ascending" | "descending" | "pyramid"> = [
            "pyramid",
            "descending",
        ];
        return {
            protocol: p,
            duration,
            ladderType:
                p === "LADDER"
                    ? ladderVariants[Math.floor(rng.next() * ladderVariants.length)]
                    : undefined,
            scoringType:
                p === "LADDER" ? "FOR_TIME" : p === "CHIPPER" ? "FOR_TIME" : "AMRAP",
        };
    }

    private shuffle<T>(array: T[], rng: SeededRng): T[] {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    private weightedPick<T>(options: Array<{ p: T; w: number }>, rng: SeededRng): T {
        const shuffled = this.shuffle(options, rng);
        const total = shuffled.reduce((s, o) => s + o.w, 0);
        let r = rng.next() * total;
        for (const o of shuffled) {
            if (r < o.w) return o.p;
            r -= o.w;
        }
        return shuffled[0].p;
    }
}

// Singleton export
export const wodAssemblyService = new WodAssemblyService();
