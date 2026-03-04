import type { FilteredMovement } from "./MovementFilterService.js";
import { movementScorer } from "./scoring/MovementScorer.js";
import { repTarget } from "./scoring/repTarget.js";
import type { HydratedContext } from "./scoring/WodHydrationService.js";
import { dailySeed, SeededRng } from "../utils/seed.js";

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

export interface AssembledWod {
    type: string;
    protocol: WodProtocol;
    category: WodCategory;
    duration?: number;
    description: string;
    movements: string[];
    rounds?: number;
    movementItems: Array<{
        reps: number;
        isMaxReps?: boolean;
        name: string;
        weight?: string;
        distance?: string;
    }>;
    ladderType?: "ascending" | "descending" | "pyramid";
    scoringType?: "AMRAP" | "FOR_TIME";
}

export interface GeneratedWorkout {
    wod: AssembledWod;
    warmup: string[];
    scalingOptions: string[];
    intensityGuidance: string;
    intendedStimulus: string;
    energySystem: string;
    primaryStimulus: string;
    timeDomain: string;
    movementEmphasis: string[];
    stimulusNote: string;
    equipmentPresetName?: string;
    equipmentUsed: string[];
}

// ─── Template Configuration ───────────────────────────────────────────────
interface TemplateConfig {
    movementCount: { min: number; max: number };
    description: (
        duration: number,
        movements: string[],
        ladderType?: string,
        scoringType?: string
    ) => string;
}

const TEMPLATES: Record<WodProtocol, TemplateConfig> = {
    AMRAP: {
        movementCount: { min: 3, max: 4 },
        description: (dur, mvs) => `${dur}-Minute AMRAP:\n${mvs.join("\n")}`,
    },
    EMOM: {
        movementCount: { min: 2, max: 4 },
        description: (dur, mvs) =>
            `EMOM ${dur}:\n${mvs.map((m, i) => `Min ${i + 1}: ${m}`).join("\n")}`,
    },
    FOR_TIME: {
        movementCount: { min: 2, max: 4 },
        description: (dur, mvs, _lt, st) =>
            st === "FOR_TIME"
                ? `For Time (Cap ${dur} min):\n${mvs.join("\n")}`
                : `For Time:\n${mvs.join("\n")}`,
    },
    TABATA: {
        movementCount: { min: 2, max: 3 },
        description: (_dur, mvs) =>
            `Tabata (20s work / 10s rest × 8 rounds):\n${mvs.join("\n")}`,
    },
    DEATH_BY: {
        movementCount: { min: 1, max: 2 },
        description: (dur, mvs) =>
            `Death By (Cap ${dur} min):\nStart with 1 rep. Add 1 rep each minute.\n${mvs.join("\n")}`,
    },
    "21_15_9": {
        movementCount: { min: 2, max: 3 },
        description: (_dur, mvs) => `21-15-9:\n${mvs.join("\n")}`,
    },
    LADDER: {
        movementCount: { min: 1, max: 2 },
        description: (dur, mvs, lt, st) => {
            const prefix =
                lt === "ascending"
                    ? "Ascending"
                    : lt === "descending"
                        ? "Descending"
                        : "Pyramid";
            const suffix =
                st === "AMRAP"
                    ? `(${dur}-Minute Clock)`
                    : `(For Time - Cap ${dur} min)`;
            const details =
                lt === "ascending"
                    ? `Start with ${mvs.length > 1 ? "low reps" : "1 set"}. Increase reps every round.`
                    : "Decrease reps every round.";
            return `${prefix} Ladder ${suffix}:\n${details}\n${mvs.join("\n")}`;
        },
    },
    CHIPPER: {
        movementCount: { min: 4, max: 6 },
        description: (_dur, mvs) =>
            `Chipper (Complete in order):\n${mvs.join("\n")}`,
    },
    INTERVAL: {
        movementCount: { min: 2, max: 3 },
        description: (dur, mvs) =>
            `Intervals (${dur} min total):\nComplete each round every 5 minutes.\n${mvs.join("\n")}`,
    },
    STRENGTH_SINGLE: {
        movementCount: { min: 1, max: 1 },
        description: (dur, mvs) =>
            `Max Strength (${dur} min Window):\nFind a heavy 1-rep max for:\n${mvs.join("\n")}`,
    },
    STRENGTH_SETS: {
        movementCount: { min: 1, max: 2 },
        description: (dur, mvs) =>
            `Strength Sets (${dur} min Window):\nWorking sets (Rest 2-3 mins):\n${mvs.join("\n")}`,
    },
    REST_DAY: {
        movementCount: { min: 0, max: 0 },
        description: () => "Rest Day: Active recovery or total rest.",
    },
};

// ─── Stimulus Metadata ────────────────────────────────────────────────────
interface StimulusMeta {
    energySystem: string;
    primaryStimulus: string;
    stimulusNote: string;
}

const STIMULUS_METADATA: Record<WodProtocol, StimulusMeta> = {
    AMRAP: {
        energySystem: "Glycolytic / Oxidative",
        primaryStimulus: "Sustained effort — manage the burn.",
        stimulusNote:
            "Maintain consistent pacing. Each round should take roughly the same time. Scale to keep moving.",
    },
    EMOM: {
        energySystem: "Mixed / Neuromuscular",
        primaryStimulus: "Consistent performance under interval fatigue.",
        stimulusNote:
            "Each movement should be completable within the minute with rest. If you can't finish, reduce reps.",
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

// ─── RPE Intensity Guidance ───────────────────────────────────────────────
const INTENSITY_GUIDANCE: Record<WodCategory, string> = {
    sprint: "RPE 9-10: Max effort — leave nothing in the tank.",
    metcon: "RPE 7-8: Hard but sustainable — 2 reps in reserve.",
    long: "RPE 6-7: Conversational pace — protect the back half.",
};

// ─── Deterministic Seed Helpers relocated to src/utils/seed.ts ────────────

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
        const movementItems = selected.map((fm) => {
            const prescription = repTarget(fm.movement, context.fitnessLevel);
            let reps = prescription.reps;

            // Protocol-specific rep overrides
            if (protocol === "LADDER") {
                // Ascending/Descending ladders should start at a low base
                if (reps > 0) {
                    // For cheap movements (Jump Rope/DU), start at 5-10
                    if (fm.movement.name.toLowerCase().includes("double under") ||
                        fm.movement.name.toLowerCase().includes("jump rope")) {
                        reps = 10;
                    } else {
                        reps = 2; // Standard G/W start
                    }
                }
            } else if (protocol === "DEATH_BY") {
                // Death by always starts with 1
                if (reps > 0) reps = 1;
            }

            return {
                reps,
                isMaxReps: false,
                name: fm.resolvedName,
                ...(prescription.distance !== undefined && { distance: prescription.distance }),
                ...(prescription.weight !== undefined && { weight: prescription.weight }),
            };
        });

        // ── 5. Build human-readable movement strings for description ──────
        const movementStrings = movementItems.map((item) => {
            if (item.distance) {
                // e.g. "12/10 cal Row" or "200 m Run"
                return `${item.distance} ${item.name}`;
            }
            let s = `${item.reps} ${item.name}`;
            if (item.weight) s += ` (${item.weight})`;
            return s;
        });

        // ── 6. Assemble WOD object ───────────────────────────────────────
        const wod: AssembledWod = {
            type: protocol,
            protocol,
            category,
            duration,
            description: config.description(duration, movementStrings, ladderType, scoringType),
            movements: selected.map((fm) => fm.movement.name),
            movementItems,
            ladderType,
            scoringType,
        };

        // ── 7. Build metadata ────────────────────────────────────────────
        const meta = STIMULUS_METADATA[protocol];
        const movementEmphasis = Array.from(
            new Set(selected.map((fm) => (fm.movement as unknown as { modality: string }).modality))
        );
        const timeDomain =
            category === "sprint" ? "< 7m" : category === "metcon" ? "7-20m" : "20m+";
        const equipmentUsed = Array.from(
            new Set(
                selected.flatMap(
                    (fm) => (fm.movement as unknown as { equipmentRequired: string[] }).equipmentRequired ?? []
                )
            )
        );

        // ── 8. Build scaling options from movement variants ───────────────
        const scalingOptions = selected.flatMap((fm) => {
            const variants: string[] = (fm.movement as unknown as { variants?: string[] }).variants ?? [];
            if (variants.length === 0) return [];
            return [`${fm.resolvedName}: ${variants[0]} (easier) / ${variants[variants.length - 1]} (harder)`];
        });

        return {
            wod,
            warmup: this.buildWarmup(category),
            scalingOptions: scalingOptions.length > 0 ? scalingOptions : ["Reduce load or volume by 20%"],
            intensityGuidance: INTENSITY_GUIDANCE[category],
            intendedStimulus: `${timeDomain} — ${movementEmphasis
                .map((m) => (m === "G" ? "Gymnastics" : m === "W" ? "Weightlifting" : "Monostructural"))
                .join(" + ")}`,
            energySystem: meta.energySystem,
            primaryStimulus: meta.primaryStimulus,
            timeDomain,
            movementEmphasis,
            stimulusNote: meta.stimulusNote,
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
            // Pick the available duration closest to preference
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
        // Shuffle the options to prevent positional bias (e.g. always hitting the last item)
        const shuffled = this.shuffle(options, rng);
        const total = shuffled.reduce((s, o) => s + o.w, 0);
        let r = rng.next() * total;
        for (const o of shuffled) {
            if (r < o.w) return o.p;
            r -= o.w;
        }
        return shuffled[0].p;
    }

    private buildWarmup(category: WodCategory): string[] {
        if (category === "sprint") {
            return [
                "3 min easy movement (jog / row / bike)",
                "10 arm circles each direction",
                "10 air squats + 10 hip circles",
                "Movement-specific activation — 2 rounds light",
            ];
        }
        if (category === "long") {
            return [
                "6 min easy cardio (nasal breathing)",
                "2 rounds: 10 air squats, 10 shoulder pass-throughs, 10 leg swings",
                "Movement-specific warm-up sets at 50% load",
            ];
        }
        // metcon default
        return [
            "4 min easy cardio",
            "2 rounds: 10 push-ups, 10 air squats, 8 ring rows",
            "Movement-specific primer — 2 light rounds",
        ];
    }
}

// Singleton export
export const wodAssemblyService = new WodAssemblyService();
