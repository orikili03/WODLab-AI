import type { IMovement } from "../../models/Movement.js";
import type { FitnessLevel } from "../../models/User.js";

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
    [/\brun\b|\bsprint\b/,             { rx: "400 m",     beginner: "200 m" }],
    // Rowing
    [/\brow\b|\browing\b/,             { rx: "500 m",     beginner: "250 m" }],
    // Ski Erg
    [/ski\s*erg/,                       { rx: "12/10 cal", beginner: "8/6 cal" }],
    // Assault / Air bike variants
    [/assault\s*bike|air\s*bike/,       { rx: "12/10 cal", beginner: "8/6 cal" }],
    // Bike erg / Echo bike / Generic cycle
    [/bike\s*erg|echo\s*bike|cycle\b/,  { rx: "15/12 cal", beginner: "10/8 cal" }],
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
        const isStrength =
            stimulusTags.includes("strength") || stimulusTags.includes("power");

        const reps = isStrength
            ? (isRx ? 5 : 8)
            : (isRx ? 10 : 12);

        // Weight: prefer movement's defaultLoadKg, fall back to generic prescription
        let weight: string | undefined;
        if (defaultLoadKg) {
            const loadKg = isRx ? defaultLoadKg.rx : defaultLoadKg.beginner;
            if (loadKg !== undefined) {
                weight = `${loadKg} kg`;
            }
        }
        if (!weight && isLoaded) {
            weight = isRx ? "60 kg" : "40 kg";
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
