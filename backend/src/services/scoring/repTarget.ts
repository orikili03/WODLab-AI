import type { IMovement } from "../../models/Movement.js";
import type { FitnessLevel } from "../../models/User.js";
import type { ProtocolBlueprint } from "./ProtocolBlueprintMatrix.js";
import type { WodProtocol } from "../WodAssemblyService.js";

// ─── Rep Prescription ─────────────────────────────────────────────────────

export interface RepPrescription {
    /** Rep count for rep-based movements; 0 for distance-based monostructural */
    reps: number;
    /** Distance string for monostructural movements (e.g. "400 m", "12/10 cal") */
    distance?: string;
    /** Weight string for loaded movements (e.g. "60 kg") */
    weight?: string;
}

// ─── Monostructural Distance Table ───────────────────────────────────────

interface MonoDistance { rx: string; beginner: string }

const MONO_BY_NAME: Array<[string | RegExp, MonoDistance]> = [
    // Running
    [/\brun\b|\bsprint\b/, { rx: "400 m", beginner: "200 m" }],
    // Rowing
    [/\brow\b|\browing\b/, { rx: "500 m", beginner: "250 m" }],
    // Ski Erg
    [/ski\s*erg/, { rx: "12/10 cal", beginner: "8/6 cal" }],
    // Assault / Air bike variants
    [/assault\s*bike|air\s*bike/, { rx: "12/10 cal", beginner: "8/6 cal" }],
    // Bike erg / Echo bike / Generic cycle
    [/bike\s*erg|echo\s*bike|cycle\b/, { rx: "15/12 cal", beginner: "10/8 cal" }],
    // Double unders — rep-based, handled separately
    // Single unders / Jump rope — rep-based, handled separately
];

// ─── repTarget ────────────────────────────────────────────────────────────

/**
 * Returns a modality-aware rep/distance/weight prescription for a movement.
 *
 * Routing:
 *  - Monostructural (M) with a known machine/distance → distance string, reps = 0
 *  - Monostructural jump rope / double under → rep count only
 *  - Weightlifting (W) → reps + optional weight (from defaultLoadKg or fallback)
 *  - Gymnastics (G) → reps only
 */
export function repTarget(movement: IMovement, fitnessLevel: FitnessLevel): RepPrescription {
    const isRx = fitnessLevel === "rx";
    const nameLower = movement.name.toLowerCase();
    const { modality, isLoaded, defaultLoadKg, stimulusTags } = movement;

    // ── Static Holds (Time-based distance, not reps) ──────────────────────
    const isHold = nameLower.includes("plank") ||
        nameLower.includes("hold") ||
        nameLower.includes("wall sit") ||
        nameLower.includes("l-sit");

    if (isHold) {
        return {
            reps: 0,
            distance: isRx ? "60 sec" : "30 sec"
        };
    }

    // ── Monostructural (M) ────────────────────────────────────────────────
    if (modality === "M") {
        // Double unders / jump rope are rep-based, not distance-based
        if (nameLower.includes("double under")) {
            return { reps: isRx ? 50 : 30 };
        }
        if (nameLower.includes("single under") || nameLower.includes("jump rope")) {
            return { reps: isRx ? 100 : 60 };
        }

        // Distance-based — try name table
        for (const [pattern, distances] of MONO_BY_NAME) {
            const matches = typeof pattern === "string"
                ? nameLower.includes(pattern)
                : pattern.test(nameLower);
            if (matches) {
                return {
                    reps: 0,
                    distance: isRx ? distances.rx : distances.beginner,
                };
            }
        }

        // Generic monostructural fallback → treat as a run
        return { reps: 0, distance: isRx ? "400 m" : "200 m" };
    }

    // ── Weightlifting (W) ─────────────────────────────────────────────────
    if (modality === "W") {

        // ── Carry / Sled movements — distance + load, not reps ───────────
        // These are in the W modality but prescribed as distance like M movements.
        const isCarry = nameLower.includes("carry") || nameLower.includes("sled") || nameLower.includes("yoke");

        if (isCarry) {
            // Sled and Yoke are heavier implements — shorter prescribed distance
            const isBigImplement = nameLower.includes("sled") || nameLower.includes("yoke");

            let distanceStr: string;
            if (isBigImplement) {
                distanceStr = isRx ? "25 m" : "15 m";
            } else {
                // Farmer carry, sandbag carry, etc.
                distanceStr = isRx ? "50 m" : "25 m";
            }

            // Load from defaultLoadKg, or sensible carry fallbacks
            let weight: string | undefined;
            if (defaultLoadKg) {
                const loadKg = isRx ? defaultLoadKg.rx : defaultLoadKg.beginner;
                if (loadKg !== undefined) {
                    weight = `${loadKg} kg`;
                }
            }
            if (!weight) {
                // Carry fallback loads if defaultLoadKg missing from DB
                if (isBigImplement) {
                    weight = isRx ? "100 kg" : "60 kg";
                } else if (nameLower.includes("sandbag")) {
                    weight = isRx ? "40 kg" : "20 kg";
                } else {
                    // Farmer carry with dumbbells/kettlebells
                    weight = isRx ? "32 kg" : "16 kg";     // per hand
                }
            }

            return { reps: 0, distance: distanceStr, weight };
        }

        // ── Tire Flip — rep-based (counted by the flip) ───────────────────
        if (nameLower.includes("tire flip") || nameLower.includes("tire")) {
            const reps = isRx ? 10 : 6;
            return { reps };
        }

        const isStrength =
            stimulusTags.includes("strength") || stimulusTags.includes("power");

        const reps = isStrength
            ? (isRx ? 5 : 8)
            : (isRx ? 10 : 12);

        // Weight: prefer movement's defaultLoadKg, fall back to sensible defaults based on equipment
        let weight: string | undefined;
        if (defaultLoadKg) {
            const loadKg = isRx ? defaultLoadKg.rx : defaultLoadKg.beginner;
            if (loadKg !== undefined) {
                weight = `${loadKg} kg`;
            }
        }

        // If the DB has missing/broken load data (e.g. isLoaded: false incorrectly), infer it
        if (!weight) {
            // Only purely unloaded W movements are things like unweighted box jumps (if classified as W)
            // If the name implies an implement, provide the fallback weight.
            if (nameLower.includes("dumbbell")) {
                weight = isRx ? "22.5 kg" : "15 kg";
            } else if (nameLower.includes("kettlebell")) {
                weight = isRx ? "24 kg" : "16 kg";
            } else if (nameLower.includes("sandbag") || nameLower.includes("med ball") || nameLower.includes("wall ball")) {
                weight = isRx ? "9 kg" : "6 kg";
            } else if (isLoaded || nameLower.includes("barbell") || nameLower.includes("clean") || nameLower.includes("snatch") || nameLower.includes("jerk")) {
                weight = isRx ? "60 kg" : "40 kg";
            }
        }

        return { reps, weight };
    }


    // ── Gymnastics (G) ────────────────────────────────────────────────────
    const isSkill = stimulusTags.includes("skill") || stimulusTags.includes("coordination");
    const reps = isSkill
        ? (isRx ? 5 : 3)
        : (isRx ? 10 : 8);

    return { reps };
}

// ─── Stimulus-Aware Rep Target (Blueprint-Driven) ─────────────────────────

/** Estimated seconds per rep by modality — used for EMOM / TABATA capping */
const SEC_PER_REP: Record<string, number> = {
    W: 4.5,    // barbell cycling is slower
    G: 3.5,    // bodyweight is faster
    M: 3.0,    // jump rope / double-under type reps
};

/**
 * Stimulus-aware volume and load prescription.
 *
 * Wraps the baseline `repTarget()` with blueprint-driven adjustments:
 *  1. Rep multiplier   — scales base reps proportional to stimulus/protocol
 *  2. EMOM capping     — limits reps so work fits within the EMOM window
 *  3. TABATA capping   — limits reps so work fits within 20s intervals
 *  4. Load fraction    — scales load proportional to stimulus intensity
 *
 * Distance-based monostructural movements (row, run, bike) pass through
 * unchanged — their distance is prescribed by the baseline, not by rep math.
 */
export function stimulusRepTarget(
    movement: IMovement,
    fitnessLevel: FitnessLevel,
    blueprint: ProtocolBlueprint,
    protocol: WodProtocol,
): RepPrescription {
    const base = repTarget(movement, fitnessLevel);
    const isRx = fitnessLevel === "rx";

    // ── Protocol-Constrained Distance Overrides ──────────────────────────
    // Distance-based movements (reps === 0 with distance) must be scaled to fit fast protocols
    if (base.distance && base.reps === 0) {
        let newDist = base.distance;

        if (protocol === "TABATA") {
            if (newDist.includes("sec")) newDist = "20 sec";
            else if (newDist.includes("m")) newDist = isRx ? "50 m" : "30 m";
            else if (newDist.includes("cal")) newDist = isRx ? "5 cal" : "3 cal";
        } else if (protocol === "EMOM" && blueprint.emomWindowSec) {
            if (newDist.includes("sec")) newDist = `${blueprint.emomWindowSec} sec`;
            else if (newDist.includes("m")) newDist = isRx ? "100 m" : "75 m";
            else if (newDist.includes("cal")) newDist = isRx ? "12 cal" : "8 cal";
        }

        return { reps: 0, distance: newDist, weight: base.weight };
    }

    // ── Rep scaling ───────────────────────────────────────────────────────
    let reps = base.reps;

    if (reps > 0 && blueprint.repMultiplier > 0) {
        reps = Math.max(1, Math.round(reps * blueprint.repMultiplier));

        // Protocol-specific capping
        const secPerRep = SEC_PER_REP[movement.modality] ?? 3.5;

        if (protocol === "EMOM" && blueprint.emomWindowSec) {
            const maxReps = Math.floor(blueprint.emomWindowSec / secPerRep);
            reps = Math.min(reps, Math.max(1, maxReps));
        }

        if (protocol === "TABATA") {
            // 20 seconds of work per interval
            const maxReps = Math.floor(20 / secPerRep);
            reps = Math.min(reps, Math.max(1, maxReps));
        }

        if (protocol === "DEATH_BY") {
            reps = 1;  // always starts at 1, ascending +1 per minute
        }

        if (protocol === "LADDER") {
            // Ladder base reps: double-under / jump rope starts higher
            const nameLower = movement.name.toLowerCase();
            if (nameLower.includes("double under") || nameLower.includes("jump rope")) {
                reps = 10;
            } else {
                reps = 2;  // standard G/W start for ascending ladder
            }
        }
    }

    // ── Load scaling ──────────────────────────────────────────────────────
    let weight = base.weight;

    if (blueprint.loadFraction > 0 && movement.defaultLoadKg) {
        const isRx = fitnessLevel === "rx";
        const baseLoad = isRx
            ? movement.defaultLoadKg.rx
            : movement.defaultLoadKg.beginner;

        if (baseLoad !== undefined && baseLoad > 0) {
            const adjustedLoad = Math.round(baseLoad * blueprint.loadFraction);
            weight = adjustedLoad > 0 ? `${adjustedLoad} kg` : undefined;
        }
    }

    return { reps, distance: base.distance, weight };
}
