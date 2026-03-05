import type { FilteredMovement } from "./MovementFilterService.js";
import { movementScorer } from "./scoring/MovementScorer.js";
import { stimulusRepTarget } from "./scoring/repTarget.js";
import { resolveBlueprint } from "./scoring/ProtocolBlueprintMatrix.js";
import type { HydratedContext } from "./scoring/WodHydrationService.js";
import { stimulusIntentService } from "./StimulusIntentService.js";
import type { ModalityComposition, SlotRequirement } from "./StimulusIntentService.js";
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

// ─── Structured Quantity ──────────────────────────────────────────────────
export interface Quantity {
    value: number;
    unit: string;    // "reps" | "m" | "cal" | "sec"
}

// ─── Movement Item (new structured format) ────────────────────────────────
export interface AssembledMovementItem {
    movementId?: mongoose.Types.ObjectId;
    family?: string;
    name: string;
    quantity: Quantity;
    load?: number;      // kg — canonical unit; frontend converts to user preference
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
    intervalWorkSec?: number;
    intervalRestSec?: number;
}

// ─── Generated Workout (full output from assembly) ────────────────────────
export interface GeneratedWorkout {
    wod: AssembledWod;
    equipmentPresetName?: string;
    equipmentUsed: string[];
}

// ─── Template Configuration ───────────────────────────────────────────────
// Movement count and duration are now derived from the ProtocolBlueprintMatrix.
// The TEMPLATES constant has been replaced by resolveBlueprint().

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
 * Parses a repTarget weight string into a canonical kg number.
 * Examples: "50 kg"  → 50
 *           "135 lb" → 61.2  (converted to kg)
 *           "RPE 7-8 (moderate-heavy)" → null (not a numeric load)
 */
function parseWeightToLoad(weight: string): number | null {
    const trimmed = weight.trim().toLowerCase();

    // RPE descriptors are not numeric loads
    if (trimmed.startsWith("rpe")) return null;

    const kgMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*kg$/);
    if (kgMatch) return parseFloat(kgMatch[1]);

    const lbMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*lb$/);
    if (lbMatch) return Math.round(parseFloat(lbMatch[1]) * 0.453592 * 10) / 10;

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
        // ── 1. Resolve StimulusIntent (coach brain — pure, no DB) ─────────
        const intent = stimulusIntentService.resolve(
            category, context, userId, salt, dateOverride
        );

        // ── 2. Score all candidates with the Coach Brain ──────────────────
        const ranked = movementScorer.rankCandidates(movements, context, availableEquipment);
        const usedNames = new Set<string>();

        // ── 3. Select protocol (seeded pick from constrained pool) ────────
        const { protocol, ladderType, scoringType } =
            this.selectProtocol(category, userId, salt, intent.allowedProtocols, dateOverride);

        // ── 3b. Protocol-specific composition locks ───────────────────────
        // If a strength protocol is selected while building a sprint/aerobic day,
        // it overrides the broad intent with strict strength requirements.
        if (protocol === "STRENGTH_SINGLE" || protocol === "STRENGTH_SETS") {
            intent.target = "strength";
            intent.modalityComposition = { G: "excluded", M: "excluded", W: "required" };
        }

        // ── 3c. Resolve blueprint (coach playbook for this combination) ───
        const blueprint = resolveBlueprint(protocol, intent.target, context.fitnessLevel);
        const rng = new SeededRng(dailySeed(userId, salt + "_dur", dateOverride));
        const duration = this.pickInRange(blueprint.durationRange, rng);

        // ── 4. Composition-directed slot fill ─────────────────────────────
        //  Fill order: required → preferred → optional (excluded never entered)
        const selected: FilteredMovement[] = [];
        const targetCount = blueprint.movementCount[1];  // max from blueprint
        const minCount = blueprint.movementCount[0];     // min from blueprint

        // For force-monostructural blueprints (classic sprint tabata), lock to M
        if (blueprint.forceMonostructural) {
            let pool = ranked;
            // The user requested to strictly leave TABATA for running sprints
            if (protocol === "TABATA") {
                const runOptions = ranked.filter(fm => fm.movement.resolvedName.toLowerCase().includes("run"));
                if (runOptions.length > 0) {
                    pool = runOptions;
                }
            }
            const monoPick = movementScorer.pickOne(
                pool, usedNames, selected, userId, salt, "M", false, intent.movementComplexity
            );
            if (monoPick) selected.push(monoPick);
        } else {
            const fillOrder = this.buildFillOrder(intent.modalityComposition);
            for (const { modality, requirement } of fillOrder) {
                if (requirement === "excluded") continue;
                if (selected.length >= targetCount) break;
                const pick = movementScorer.pickOne(
                    ranked, usedNames, selected, userId, salt, modality, false, intent.movementComplexity
                );
                if (pick) selected.push(pick);
            }
        }

        // Fill any remaining slots to hit the min count (best-available, no modality constraint)
        while (selected.length < minCount) {
            const pick = movementScorer.pickOne(
                ranked, usedNames, selected, userId, salt, undefined, false, intent.movementComplexity
            );
            if (!pick) break;
            selected.push(pick);
        }

        if (selected.length === 0) {
            throw new Error(
                "Coach Engine: No eligible movements after scoring. Relax equipment constraints."
            );
        }

        // ── 5. Build movementItems using stimulus-aware prescription ──────
        const movementItems: AssembledMovementItem[] = selected.map((fm) => {
            const prescription = stimulusRepTarget(
                fm.movement, context.fitnessLevel, blueprint, protocol
            );

            // ── Build structured quantity ──────────────────────────────────
            let quantity: Quantity;
            if (prescription.distance) {
                quantity = parseDistanceToQuantity(prescription.distance);
            } else {
                quantity = { value: prescription.reps, unit: "reps" };
            }

            // ── Build structured load ─────────────────────────────────────
            let load: number | undefined;
            if (prescription.weight) {
                const parsed = parseWeightToLoad(prescription.weight);
                if (parsed !== null) load = parsed;
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

        // ── 6. Assemble WOD object ───────────────────────────────────────
        const wod: AssembledWod = {
            type: protocol,
            protocol,
            category,
            duration,
            rounds: blueprint.rounds,
            movementItems,
            ladderType,
            scoringType,
            intervalWorkSec: blueprint.intervalWorkSec,
            intervalRestSec: blueprint.intervalRestSec,
        };

        // ── 7. Build equipment metadata ───────────────────────────────
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

    /**
     * Select a protocol from the constrained pool provided by StimulusIntent.
     * Duration is now resolved from the ProtocolBlueprintMatrix — this method
     * only resolves protocol identity + structural metadata.
     */
    private selectProtocol(
        category: WodCategory,
        userId: string,
        salt: string = "",
        allowedProtocols: WodProtocol[],
        dateOverride?: Date,
    ): {
        protocol: WodProtocol;
        ladderType?: "ascending" | "descending" | "pyramid";
        scoringType?: "AMRAP" | "FOR_TIME";
    } {
        const rng = new SeededRng(dailySeed(userId, salt, dateOverride));
        const allowedSet = new Set(allowedProtocols);

        const constrain = (all: Array<{ p: WodProtocol; w: number }>) => {
            const filtered = all.filter(o => allowedSet.has(o.p));
            return filtered.length > 0 ? filtered : all; // safety fallback
        };

        if (category === "sprint") {
            const all: Array<{ p: WodProtocol; w: number }> = [
                { p: "21_15_9", w: 25 },
                { p: "TABATA", w: 25 },
                { p: "FOR_TIME", w: 20 },
                { p: "STRENGTH_SINGLE", w: 15 },
                { p: "LADDER", w: 15 },
            ];
            const p = this.weightedPick(constrain(all), rng);
            return {
                protocol: p,
                ladderType: p === "LADDER" ? "ascending" : undefined,
                scoringType: p === "LADDER" ? "AMRAP" : "FOR_TIME",
            };
        }

        if (category === "metcon") {
            const all: Array<{ p: WodProtocol; w: number }> = [
                { p: "AMRAP", w: 24 },
                { p: "EMOM", w: 28 },
                { p: "FOR_TIME", w: 28 },
                { p: "DEATH_BY", w: 10 },
                { p: "LADDER", w: 10 },
            ];
            const p = this.weightedPick(constrain(all), rng);
            return {
                protocol: p,
                ladderType: p === "LADDER" ? "ascending" : undefined,
                scoringType: p === "LADDER" ? "AMRAP" : p === "FOR_TIME" ? "FOR_TIME" : "AMRAP",
            };
        }

        // Long / Aerobic
        const all: Array<{ p: WodProtocol; w: number }> = [
            { p: "CHIPPER", w: 30 },
            { p: "AMRAP", w: 20 },
            { p: "INTERVAL", w: 20 },
            { p: "STRENGTH_SETS", w: 15 },
            { p: "LADDER", w: 15 },
        ];
        const p = this.weightedPick(constrain(all), rng);
        const ladderVariants: Array<"ascending" | "descending" | "pyramid"> = [
            "pyramid",
            "descending",
        ];
        return {
            protocol: p,
            ladderType:
                p === "LADDER"
                    ? ladderVariants[Math.floor(rng.next() * ladderVariants.length)]
                    : undefined,
            scoringType:
                p === "LADDER" ? "FOR_TIME" : p === "CHIPPER" ? "FOR_TIME" : "AMRAP",
        };
    }

    // ─── Composition Slot Fill Helper ─────────────────────────────────────

    /**
     * Convert a ModalityComposition into an ordered fill sequence.
     * Priority: required → preferred → optional (excluded entries are never yielded).
     */
    private buildFillOrder(
        composition: ModalityComposition,
    ): Array<{ modality: "G" | "W" | "M"; requirement: SlotRequirement }> {
        const PRIORITY: Record<SlotRequirement, number> = {
            required: 0,
            preferred: 1,
            optional: 2,
            excluded: 3,
        };
        return (["G", "W", "M"] as const)
            .map(m => ({ modality: m, requirement: composition[m] }))
            .filter(entry => entry.requirement !== "excluded")
            .sort((a, b) => PRIORITY[a.requirement] - PRIORITY[b.requirement]);
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

    /** Seeded integer pick within an inclusive range [min, max]. */
    private pickInRange(range: [number, number], rng: SeededRng): number {
        const [min, max] = range;
        if (min === max) return min;
        return min + Math.floor(rng.next() * (max - min + 1));
    }
}

// Singleton export
export const wodAssemblyService = new WodAssemblyService();
