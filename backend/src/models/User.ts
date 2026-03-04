import mongoose, { Schema, type Document } from "mongoose";

// ─── Fitness Levels (Option B: 3-level CrossFit terminology) ──────────────
export const FITNESS_LEVELS = ["beginner", "scaled", "rx"] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

// ─── Equipment Sub-schemas (matches frontend EquipmentState Zod schema) ──
const equipmentSelectionSchema = new Schema(
    {
        id: { type: String, required: true },
        minWeight: { type: Number },
        maxWeight: { type: Number },
    },
    { _id: false }
);

const customPresetSchema = new Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        selected: [equipmentSelectionSchema],
    },
    { _id: false }
);

// ─── User Schema ──────────────────────────────────────────────────────────
export interface IUser extends Document {
    email: string;
    passwordHash: string;
    fitnessLevel: FitnessLevel;
    equipment: {
        selected: Array<{ id: string; minWeight?: number; maxWeight?: number }>;
        customPresets: Array<{
            id: string;
            name: string;
            selected: Array<{ id: string; minWeight?: number; maxWeight?: number }>;
        }>;
    };
    workoutDuration: number; // preferred metcon duration in minutes
    goals: string[];
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        // --- Auth ---
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },

        // --- Fitness Profile ---
        fitnessLevel: {
            type: String,
            enum: FITNESS_LEVELS,
            default: "beginner",
        },

        // --- Equipment (exact match to frontend EquipmentState) ---
        equipment: {
            selected: { type: [equipmentSelectionSchema], default: [] },
            customPresets: { type: [customPresetSchema], default: [] },
        },

        // --- Preferences ---
        workoutDuration: { type: Number, default: 15 },
        goals: { type: [String], default: [] },

        // ─── Future Evolution Notes ───────────────────────────────
        // • injuries[] — NOT implemented yet. Will be added when
        //   the injury management UI is built (Phase 2 Coach Agent
        //   will use active injuries for auto-scaling suggestions).
        //   Schema shape when added:
        //   { area: string, severity: "mild"|"moderate"|"severe",
        //     notes?: string, dateReported: Date, active: boolean }
        // ──────────────────────────────────────────────────────────
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
