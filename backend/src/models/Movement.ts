import mongoose, { Schema, type Document } from "mongoose";

// ─── CrossFit Modalities ──────────────────────────────────────────────────
export const MODALITIES = ["G", "W", "M"] as const; // G=Gymnastics, W=Weightlifting+OddObject, M=Monostructural
export type Modality = (typeof MODALITIES)[number];

// ─── Movement Difficulty Tiers ────────────────────────────────────────────
export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "elite"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

// ─── 10 General Physical Skills (CrossFit L1 Manual) ──────────────────────
export const STIMULUS_TAGS = [
    "strength",
    "power",
    "endurance",
    "stamina",
    "flexibility",
    "speed",
    "coordination",
    "agility",
    "balance",
    "accuracy",
    "skill",
    "engine",
    "recovery"
] as const;
export type StimulusTag = (typeof STIMULUS_TAGS)[number];

// ─── Fitness Levels (shared with User model) ──────────────────────────────
import { FITNESS_LEVELS } from "./User.js";

// ─── Sub-schemas ──────────────────────────────────────────────────────────
const progressionSchema = new Schema(
    {
        level: { type: String, enum: FITNESS_LEVELS, required: true },
        variant: { type: String, required: true }, // e.g. "Ring Row" for beginner pull-up
    },
    { _id: false }
);

const defaultLoadSchema = new Schema(
    {
        beginner: { type: Number },
        scaled: { type: Number },
        rx: { type: Number },
    },
    { _id: false }
);

// ─── Movement Interface ───────────────────────────────────────────────────
export interface IMovement extends Document {
    name: string;
    abbreviation?: string;
    modality: Modality;
    difficulty?: DifficultyLevel;      // 4-tier: beginner | intermediate | advanced | elite
    stimulusTags: StimulusTag[];
    effects?: string[];                 // Coach-level effect tags: "engine", "mental", "stability"…
    patterns?: string[];                // Multi-pattern array: ["hinge", "posterior-chain", "grip"]
    equipmentRequired: string[];
    bodyweightOnly: boolean;
    family?: string;
    variants: string[];
    progressions: Array<{ level: string; variant: string }>;
    defaultLoadKg?: { beginner?: number; scaled?: number; rx?: number };
    isLoaded: boolean;
    description?: string;
    cues: string[];
    createdAt: Date;
    updatedAt: Date;
}

// ─── Movement Schema ──────────────────────────────────────────────────────
const movementSchema = new Schema<IMovement>(
    {
        // --- Identity ---
        name: { type: String, required: true, unique: true, trim: true },
        abbreviation: { type: String, trim: true },

        // --- CrossFit Classification ---
        modality: { type: String, enum: MODALITIES, required: true },
        difficulty: { type: String, enum: DIFFICULTY_LEVELS }, // 4-tier difficulty
        stimulusTags: [{ type: String }],
        effects: [{ type: String }],    // Coach effect tags: "engine", "mental", "stability"…
        patterns: [{ type: String }],   // Multi-pattern: ["hinge", "posterior-chain", "grip"]

        // --- Equipment Requirements ---
        equipmentRequired: [{ type: String }], // IDs match frontend EQUIPMENT_CATALOG
        bodyweightOnly: { type: Boolean, default: false },

        // --- Movement Family & Variants ---
        family: { type: String, trim: true }, // primary pattern: "squat", "press", "pull", "hinge"
        variants: [{ type: String }],
        progressions: [progressionSchema], // skill ladder per fitness level

        // --- Load & Rep Defaults ---
        defaultLoadKg: { type: defaultLoadSchema },
        isLoaded: { type: Boolean, default: false },

        // --- Metadata ---
        description: { type: String },
        cues: [{ type: String }], // coach cues: "drive through heels"
    },
    { timestamps: true }
);

// ─── Indexes for Rules Engine queries ─────────────────────────────────────
movementSchema.index({ modality: 1 });
movementSchema.index({ difficulty: 1 });
movementSchema.index({ family: 1 });
movementSchema.index({ equipmentRequired: 1 });
movementSchema.index({ "progressions.level": 1 });
movementSchema.index({ bodyweightOnly: 1 });

export const Movement = mongoose.model<IMovement>("Movement", movementSchema);
