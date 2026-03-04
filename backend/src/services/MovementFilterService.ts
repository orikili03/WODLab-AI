import { movementCacheService } from "./MovementCacheService.js";
import type { IMovement } from "../models/Movement.js";
import type { FitnessLevel } from "../models/User.js";
import type { Modality } from "../models/Movement.js";

// ─── Filter Input ─────────────────────────────────────────────────────────
export interface MovementFilterInput {
    /** Equipment IDs the user has available (from frontend EQUIPMENT_CATALOG) */
    availableEquipment: string[];
    /** User's fitness level */
    fitnessLevel: FitnessLevel;
    /** Optional: restrict to specific modality */
    modality?: Modality;
    /** If true, only return bodyweight movements */
    bodyweightOnly?: boolean;
    /** Optional: restrict to specific movement family */
    family?: string;
    /** Optional: require specific stimulus tag */
    stimulusTag?: string;
    /** Optional: restrict to specific difficulty band */
    difficulty?: string;
}

// ─── Filter Result ────────────────────────────────────────────────────────
export interface FilteredMovement {
    /** Original movement document */
    movement: IMovement;
    /** The appropriate variant name for the user's fitness level */
    resolvedName: string;
    /** Default load for the user's level (kg), if applicable */
    defaultLoadKg?: number;
}

/**
 * MovementFilterService
 *
 * Core Rules Engine service that narrows the full MovementLibrary
 * down to movements that are:
 * 1. Possible with the user's equipment
 * 2. Appropriate for the user's fitness level
 * 3. Optionally filtered by modality, family, or stimulus
 */
export class MovementFilterService {
    /**
     * Returns movements the user can perform given their equipment and level.
     */
    async filter(input: MovementFilterInput): Promise<FilteredMovement[]> {
        const candidates = await movementCacheService.getAll();

        // ─── Filter Logic (In-Memory) ───────────────────────────────────
        const equipmentSet = new Set(input.availableEquipment);

        const eligible = candidates.filter((m) => {
            // 1. Modality filter
            if (input.modality && m.modality !== input.modality) return false;

            // 2. Family filter
            if (input.family && m.family !== input.family) return false;

            // 3. Stimulus filter
            if (input.stimulusTag && !m.stimulusTags.includes(input.stimulusTag as any)) return false;

            // 4. Difficulty filter
            if (input.difficulty && m.difficulty !== input.difficulty) return false;

            // 5. Bodyweight-only filter
            if (input.bodyweightOnly && !m.bodyweightOnly) return false;

            // 5. Equipment Check
            // A movement is valid if bodyweight OR all required equipment is in the user's available set
            if (m.bodyweightOnly) return true;
            if (!m.equipmentRequired || m.equipmentRequired.length === 0) return true;
            return m.equipmentRequired.every((eq) => equipmentSet.has(eq));
        });

        // ─── Resolve variant name + load for fitness level ──────────────
        return eligible.map((m) => {
            const resolved = this.resolveForLevel(m as unknown as Parameters<typeof this.resolveForLevel>[0], input.fitnessLevel);
            return {
                movement: m as unknown as IMovement,
                resolvedName: resolved.name,
                defaultLoadKg: resolved.loadKg,
            };
        });
    }

    /**
     * Given a movement and a fitness level, resolve the appropriate
     * variant name and default load.
     *
     * Logic:
     * - If a progression exists for the user's level, use that variant
     * - Otherwise fall back to the movement's base name
     * - Load comes from defaultLoadKg for the user's level
     */
    private resolveForLevel(
        movement: Record<string, unknown> & {
            name: string;
            progressions?: Array<{ level: string; variant: string }>;
            defaultLoadKg?: { beginner?: number; scaled?: number; rx?: number };
        },
        level: FitnessLevel
    ): { name: string; loadKg?: number } {
        // Check for level-specific progression variant
        const progression = movement.progressions?.find((p) => p.level === level);
        const name = progression?.variant ?? movement.name;

        // Get default load for this level
        const loadKg = movement.defaultLoadKg?.[level] ?? undefined;

        return { name, loadKg };
    }

    /**
     * Convenience: get movements grouped by modality for balanced programming.
     */
    async filterGroupedByModality(
        input: Omit<MovementFilterInput, "modality">
    ): Promise<Record<string, FilteredMovement[]>> {
        const allFiltered = await this.filter(input);

        const grouped: Record<string, FilteredMovement[]> = {
            G: [], // Gymnastics
            W: [], // Weightlifting
            M: [], // Monostructural
        };

        for (const fm of allFiltered) {
            const mod = (fm.movement as unknown as { modality: string }).modality;
            if (mod in grouped) {
                grouped[mod].push(fm);
            }
        }

        return grouped;
    }
}

// Singleton export
export const movementFilterService = new MovementFilterService();
