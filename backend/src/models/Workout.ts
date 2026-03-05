import mongoose, { Schema, type Document } from "mongoose";

// ─── Quantity Sub-schema (unified reps / distance / calories) ──────────────
const quantitySchema = new Schema(
    {
        value: { type: Number, required: true },   // e.g. 15, 400, 20
        unit: { type: String, required: true },     // "reps" | "m" | "cal" | "sec"
    },
    { _id: false }
);

// ─── Performed Volume Sub-schema ──────────────────────────────────────────
// Tracks what the athlete actually completed per movement.
// repsPerRound: one entry per round — [15,15,15] for uniform, [21,15,9] for descending,
//               or [1,2,...,N] for ladder/death-by progressions.
// totalReps: pre-computed sum of repsPerRound (for fast aggregation queries).
const performedVolumeSchema = new Schema(
    {
        repsPerRound: [{ type: Number }],           // array — one entry per completed round
        totalReps:    { type: Number },              // sum(repsPerRound) — computed on save
    },
    { _id: false }
);

// ─── Performed Sub-schema (per movement item) ─────────────────────────────
const performedSchema = new Schema(
    {
        volume: { type: performedVolumeSchema },
        load:   { type: Number },                   // kg — actual weight used
    },
    { _id: false }
);

// ─── Movement Item (structured movement within a WOD) ─────────────────────
const movementItemSchema = new Schema(
    {
        movementId: { type: Schema.Types.ObjectId, ref: "Movement" }, // link to library
        family:     { type: String },               // e.g. "squat", "hinge", "pull"
        name:       { type: String, required: true }, // display name: "Thruster"
        quantity:   { type: quantitySchema, required: true },
        load:       { type: Number },               // kg — prescribed load (bodyweight = absent)
        isMaxReps:  { type: Boolean, default: false },
        performed:  { type: performedSchema },      // optional — filled post-workout
    },
    { _id: false }
);

// ─── WOD Spec (the core workout structure) ────────────────────────────────
const wodSpecSchema = new Schema(
    {
        type:          { type: String, required: true }, // "AMRAP", "EMOM", "FOR_TIME", etc.
        duration:      { type: Number },                 // minutes (protocol time cap / length)
        rounds:        { type: Number },                 // for RFT / EMOM (null for AMRAPs)
        movementItems: [movementItemSchema],             // structured movement data
        ladderType:    { type: String },                 // "ascending" | "descending" | "pyramid"
        scoringType:   { type: String },                 // "AMRAP" | "FOR_TIME"
    },
    { _id: false }
);

// ─── Session Sub-schema (completion data captured at end of workout) ───────
// totalSeconds: actual elapsed time — meaningful for FOR_TIME / INTERVAL / CHIPPER;
//               for AMRAP/EMOM the duration is fixed, so derive rounds from performed.
// rx: did the athlete complete the workout at prescribed weight/movement standards?
// notes: optional freeform — useful for coach agent context in Phase 2.
const sessionSchema = new Schema(
    {
        totalSeconds: { type: Number },
        rx:           { type: Boolean, required: true },
        notes:        { type: String },
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
            load?: number;                          // kg — prescribed load
            isMaxReps?: boolean;
            performed?: {
                volume?: {
                    repsPerRound?: number[];        // one entry per completed round
                    totalReps?: number;             // pre-computed: sum(repsPerRound)
                };
                load?: number;                      // kg — actual weight used
            };
        }>;
        ladderType?: string;
        scoringType?: string;
    };

    // --- Performance Tracking ---
    completedAt?: Date;                             // null = not done; Date = finished
    session?: {
        totalSeconds?: number;                      // FOR_TIME / INTERVAL actual elapsed
        rx: boolean;                                // completed at prescribed standards?
        notes?: string;                             // freeform athlete note
    };
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
        session:     { type: sessionSchema },
        rpe:         { type: Number, min: 1, max: 5 },
    },
    { timestamps: true }
);

// ─── Indexes for history queries & variance checking ──────────────────────
workoutSchema.index({ userId: 1, dateString: -1 });    // fast history lookup
workoutSchema.index({ userId: 1, "wod.type": 1 });     // filter by protocol type

export const Workout = mongoose.model<IWorkout>("Workout", workoutSchema);
