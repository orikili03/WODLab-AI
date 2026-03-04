import mongoose, { Schema, type Document } from "mongoose";

// ─── Quantity Sub-schema (unified reps / distance / calories) ──────────────
const quantitySchema = new Schema(
    {
        value: { type: Number, required: true },   // e.g. 15, 400, 20
        unit: { type: String, required: true },     // "reps" | "m" | "cal" | "sec"
    },
    { _id: false }
);

// ─── Load Sub-schema (supports future LB/KG user preference conversion) ───
const loadSchema = new Schema(
    {
        value: { type: Number, required: true },   // e.g. 60
        unit: { type: String, required: true },     // "kg" | "lb"
    },
    { _id: false }
);

// ─── Movement Item (structured movement within a WOD) ─────────────────────
const movementItemSchema = new Schema(
    {
        movementId: { type: Schema.Types.ObjectId, ref: "Movement" }, // link to library
        family: { type: String },                   // e.g. "squat", "hinge", "pull"
        name: { type: String, required: true },     // display name: "Thruster"
        quantity: { type: quantitySchema, required: true },
        load: { type: loadSchema },                 // optional — bodyweight moves have none
        isMaxReps: { type: Boolean, default: false },
    },
    { _id: false }
);

// ─── WOD Spec (the core workout structure) ────────────────────────────────
const wodSpecSchema = new Schema(
    {
        type: { type: String, required: true },     // "AMRAP", "EMOM", "FOR_TIME", etc.
        duration: { type: Number },                 // minutes (protocol time cap / length)
        rounds: { type: Number },                   // for RFT / EMOM (null for AMRAPs)
        movementItems: [movementItemSchema],        // structured movement data
        ladderType: { type: String },               // "ascending" | "descending" | "pyramid"
        scoringType: { type: String },              // "AMRAP" | "FOR_TIME"
    },
    { _id: false }
);

// ─── Workout Interface ────────────────────────────────────────────────────
export interface IWorkout extends Document {
    // --- Identification ---
    wodId: string;                                  // "[userId]-[DDMMYYYY]-[HHMMSS]"
    userId: mongoose.Types.ObjectId;

    // --- Timing ---
    dateString: string;                             // "DD/MM/YYYY"
    timeString: string;                             // "HH:MM"

    // --- User Preferences ---
    durationPreference: string;                     // "sprint" | "metcon" | "long"

    // --- Equipment Context ---
    equipmentPresetName?: string;
    equipmentUsed?: string[];

    // --- Protocol ---
    type: string;                                   // "AMRAP", "FOR_TIME", etc.
    durationMinutes: number;                        // predicted total time

    // --- Core WOD Structure ---
    wod: {
        type: string;
        duration?: number;
        rounds?: number;
        movementItems: Array<{
            movementId?: mongoose.Types.ObjectId;
            family?: string;
            name: string;
            quantity: { value: number; unit: string };
            load?: { value: number; unit: string };
            isMaxReps?: boolean;
        }>;
        ladderType?: string;
        scoringType?: string;
    };

    // --- Performance Tracking ---
    completedAt?: Date;                             // null = not done; Date = finished
    scoreValue?: number;                            // total reps equivalent (e.g. 212)
    scoreString?: string;                           // human-readable (e.g. "8 rounds + 12 reps")
    rpe?: number;                                   // 1-5 scale

    createdAt: Date;
    updatedAt: Date;
}

// ─── Workout Schema ───────────────────────────────────────────────────────
const workoutSchema = new Schema<IWorkout>(
    {
        // --- Identification ---
        wodId: { type: String, required: true, unique: true },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // --- Timing ---
        dateString: { type: String, required: true },
        timeString: { type: String, required: true },

        // --- User Preferences ---
        durationPreference: { type: String, required: true },

        // --- Equipment Context ---
        equipmentPresetName: { type: String },
        equipmentUsed: [{ type: String }],

        // --- Protocol ---
        type: { type: String, required: true },
        durationMinutes: { type: Number, required: true },

        // --- Core WOD Structure ---
        wod: { type: wodSpecSchema, required: true },

        // --- Performance Tracking ---
        completedAt: { type: Date },
        scoreValue: { type: Number },
        scoreString: { type: String },
        rpe: { type: Number, min: 1, max: 5 },
    },
    { timestamps: true }
);

// ─── Indexes for history queries & variance checking ──────────────────────
workoutSchema.index({ userId: 1, dateString: -1 });    // fast history lookup
workoutSchema.index({ userId: 1, "wod.type": 1 });     // filter by protocol type

export const Workout = mongoose.model<IWorkout>("Workout", workoutSchema);
