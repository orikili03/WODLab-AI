import mongoose, { Schema, type Document } from "mongoose";

// ─── Movement Item (structured movement within a WOD) ─────────────────────
const movementItemSchema = new Schema(
    {
        reps: { type: Number, required: true },
        isMaxReps: { type: Boolean, default: false },
        name: { type: String, required: true },
        weight: { type: String },   // e.g. "60kg", "135 lb"
        distance: { type: String }, // e.g. "400m", "500m"
    },
    { _id: false }
);

// ─── WOD Spec (the core workout structure) ────────────────────────────────
const wodSpecSchema = new Schema(
    {
        type: { type: String, required: true },         // "AMRAP", "EMOM", "FOR_TIME", etc.
        duration: { type: Number },                     // minutes (optional for RFT)
        description: { type: String, required: true },  // human-readable summary
        movements: [{ type: String }],                  // e.g. ["Deadlift", "Pull-Up"]
        rounds: { type: Number },                       // for RFT / EMOM
        movementItems: [movementItemSchema],            // structured movement data
    },
    { _id: false }
);

// ─── Workout Interface ────────────────────────────────────────────────────
// Matches frontend WorkoutResponse Zod schema exactly
export interface IWorkout extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
    type: string;
    durationMinutes: number;
    wod: {
        type: string;
        duration?: number;
        description: string;
        movements: string[];
        rounds?: number;
        movementItems?: Array<{
            reps: number;
            isMaxReps?: boolean;
            name: string;
            weight?: string;
            distance?: string;
        }>;
    };
    warmup: string[];
    finisher?: string[];
    intensityGuidance: string;
    intendedStimulus?: string;
    timeDomain?: string;
    movementEmphasis?: string[];
    stimulusNote?: string;
    energySystem?: string;
    primaryStimulus?: string;
    equipmentPresetName?: string;
    equipmentUsed?: string[];
    completed: boolean;
    completionTime?: number;    // seconds
    roundsOrReps?: number;      // for AMRAP scoring
    createdAt: Date;
    updatedAt: Date;
}

// ─── Workout Schema ───────────────────────────────────────────────────────
const workoutSchema = new Schema<IWorkout>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        date: { type: Date, required: true, default: Date.now },
        type: { type: String, required: true },
        durationMinutes: { type: Number, required: true },

        // --- Core WOD Structure ---
        wod: { type: wodSpecSchema, required: true },

        // --- Supporting Content ---
        warmup: [{ type: String }],
        finisher: [{ type: String }],
        intensityGuidance: { type: String, default: "" },
        intendedStimulus: { type: String },
        timeDomain: { type: String },
        movementEmphasis: [{ type: String }],
        stimulusNote: { type: String },
        energySystem: { type: String },
        primaryStimulus: { type: String },
        equipmentPresetName: { type: String },
        equipmentUsed: [{ type: String }],

        // --- Completion Tracking ---
        completed: { type: Boolean, default: false },
        completionTime: { type: Number },   // seconds elapsed
        roundsOrReps: { type: Number },     // AMRAP score
    },
    { timestamps: true }
);

// ─── Indexes for history queries & variance checking ──────────────────────
workoutSchema.index({ userId: 1, date: -1 });  // fast history lookup, newest first
workoutSchema.index({ userId: 1, "wod.type": 1 }); // filter by protocol type

export const Workout = mongoose.model<IWorkout>("Workout", workoutSchema);
