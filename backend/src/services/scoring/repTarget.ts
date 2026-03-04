import type { IMovement } from "../../models/Movement.js";
import type { FitnessLevel } from "../../models/User.js";

// ─── Rep Prescription ─────────────────────────────────────────────────────

/**
 * RepPrescription is the structured output of repTarget().
 *
 * IMPORTANT — Frontend Compatibility:
 *   MovementItemSpec.reps is typed as `number` (Zod: z.number()).
 *   We NEVER put a string into `reps`.
 *   For Monostructural movements, use `distance` (optional string field on
 *   MovementItemSpec) — WodBlock.tsx already renders `{distance} {name}`
 *   when distance is set, and ignores `reps` entirely in that branch.
 */
export interface RepPrescription {
    /** Integer rep count. Set to 0 when distance overrides rendering. */
    reps: number;
    /** E.g. "200 m", "12/10 cal" — used for Monostructural movements. */
    distance?: string;
    /** E.g. "50 kg", "RPE 7-8" — used for loaded Weightlifting movements. */
    weight?: string;
}

// ─── Rep Target Logic ─────────────────────────────────────────────────────

/**
 * repTarget
 *
 * Returns a modality-aware RepPrescription for a given movement + level.
 * Replaces the static `repSchemes[]` arrays in the old WodAssemblyService.
 *
 * Modality rules:
 *   M (Monostructural) → distance / calories in `distance` field; reps = 0
 *   W (Weightlifting)  → integer reps + optional weight string
 *   G (Gymnastics)     → integer reps scaled to difficulty
 */
export function repTarget(movement: IMovement, level: FitnessLevel): RepPrescription {
    const name = movement.name.toLowerCase();
    const modality = movement.modality;
    const difficulty = (movement as unknown as Record<string, string>).difficulty ?? "intermediate";

    // ── Monostructural ──────────────────────────────────────────────────
    if (modality === "M") {
        if (name.includes("run") || name.includes("sprint")) {
            return { reps: 0, distance: "200 m" };
        }
        if (name.includes("row") || name.includes("bike erg") || name.includes("ski")) {
            const cals = level === "rx" ? "15/12 cal" : "12/10 cal";
            return { reps: 0, distance: cals };
        }
        if (name.includes("assault bike")) {
            return { reps: 0, distance: "10/8 cal" };
        }
        if (name.includes("double under")) {
            return { reps: 30 };
        }
        if (name.includes("jump rope") || name.includes("single under")) {
            return { reps: 60 };
        }
        if (name.includes("swim")) {
            return { reps: 0, distance: "50 m" };
        }
        if (name.includes("shuttle")) {
            return { reps: 0, distance: "5-10-15 m" };
        }
        // Fallback for any other monostructural
        return { reps: 0, distance: "12/10 cal" };
    }

    // ── Weightlifting ───────────────────────────────────────────────────
    if (modality === "W") {
        const reps = difficulty === "advanced" ? 6 : level === "beginner" ? 8 : 10;

        // Resolve load from defaultLoadKg if available, otherwise RPE descriptor
        const loadKg = movement.defaultLoadKg?.[level];
        const weight = loadKg
            ? `${loadKg} kg`
            : reps <= 6
                ? "RPE 8-9 (heavy)"
                : "RPE 7-8 (moderate-heavy)";

        return { reps, weight };
    }

    // ── Gymnastics ──────────────────────────────────────────────────────
    if (modality === "G") {
        let reps: number;
        if (difficulty === "advanced") {
            reps = 5;
        } else if (difficulty === "intermediate") {
            reps = 10;
        } else {
            // beginner
            reps = 14;
        }

        // Carries and holds: use distance/time instead of reps
        if (name.includes("plank") || name.includes("hold")) {
            return { reps: 0, distance: "30 sec" };
        }
        if (name.includes("walk") && !name.includes("lunge")) {
            return { reps: 0, distance: "10 m" };
        }

        return { reps };
    }

    // ── Recovery (should not normally appear in metcon) ─────────────────
    return { reps: 0, distance: "45 sec" };
}
