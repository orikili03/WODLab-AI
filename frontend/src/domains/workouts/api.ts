import { z } from "zod";

// ─── Structured Movement Quantity ─────────────────────────────────────────
export const quantitySchema = z.object({
    value: z.number(),
    unit: z.string(),    // "reps" | "m" | "cal" | "sec"
});

// ─── Performed Volume ─────────────────────────────────────────────────────
// repsPerRound: one entry per completed round (supports 21-15-9, LADDER, etc.)
// totalReps: pre-computed sum of repsPerRound (for quick display)
export const performedVolumeSchema = z.object({
    repsPerRound: z.array(z.number()),
    totalReps:    z.number(),
});

// ─── Performed Data (post-workout actuals per movement) ───────────────────
export const performedSchema = z.object({
    volume: performedVolumeSchema.optional(),
    load:   z.number().optional(),    // kg actual weight used
});

// ─── Movement Item (structured movement within a WOD) ─────────────────────
export const movementItemSpecSchema = z.object({
    movementId: z.string().optional(),
    family:     z.string().optional(),
    name:       z.string(),
    quantity:   quantitySchema,
    load:       z.number().optional(),    // kg prescribed (plain number, canonical unit)
    isMaxReps:  z.boolean().optional(),
    performed:  performedSchema.optional(),
});

// ─── WOD Spec (core workout structure) ────────────────────────────────────
export const wodSchema = z.object({
    type:         z.string(),
    protocol:     z.string().optional(),
    category:     z.string().optional(),
    duration:     z.number().optional(),
    rounds:       z.number().optional(),
    movementItems: z.array(movementItemSpecSchema),
    ladderType:   z.string().optional(),
    scoringType:  z.string().optional(),
});

// ─── Workout Spec (what the backend generates) ────────────────────────────
export const workoutSpecSchema = z.object({
    wod:                z.object({ ...wodSchema.shape }),
    equipmentPresetName: z.string().optional(),
    equipmentUsed:       z.array(z.string()).optional(),
});

// ─── Session block (post-workout athlete data) ────────────────────────────
export const sessionSchema = z.object({
    totalSeconds: z.number().optional(),   // auto-captured from timer
    rx:           z.boolean(),             // athlete confirmed prescribed weight
    notes:        z.string().optional(),   // freeform post-workout note
});

// ─── Full Workout Response (from DB, includes tracking fields) ────────────
export const workoutResponseSchema = z.object({
    // --- Identification ---
    id:    z.string(),
    wodId: z.string(),

    // --- Timing ---
    dateString: z.string(),
    timeString: z.string(),

    // --- User Preferences ---
    durationPreference: z.string(),

    // --- Equipment Context ---
    equipmentPresetName: z.string().optional(),
    equipmentUsed:       z.array(z.string()).optional(),

    // --- Protocol ---
    type:            z.string(),
    durationMinutes: z.number(),

    // --- Core WOD Structure ---
    wod: wodSchema,

    // --- Performance Tracking ---
    completedAt: z.string().nullable().optional(),
    session:     sessionSchema.optional(),
    rpe:         z.number().optional(),
});

export type Quantity          = z.infer<typeof quantitySchema>;
export type PerformedVolume   = z.infer<typeof performedVolumeSchema>;
export type Performed         = z.infer<typeof performedSchema>;
export type MovementItemSpec  = z.infer<typeof movementItemSpecSchema>;
export type WodSpec           = z.infer<typeof wodSchema>;
export type WorkoutSpec       = z.infer<typeof workoutSpecSchema>;
export type Session           = z.infer<typeof sessionSchema>;
export type WorkoutResponse   = z.infer<typeof workoutResponseSchema>;

// ─── Complete Workout Payload ─────────────────────────────────────────────
export const completeWorkoutPayloadSchema = z.object({
    workoutId: z.string(),
    rpe:       z.number().min(1).max(5).optional(),
    session:   sessionSchema.optional(),
});

export type CompleteWorkoutPayload = z.infer<typeof completeWorkoutPayloadSchema>;

// ─── Paginated History Response ───────────────────────────────────────────
export const paginatedHistorySchema = z.object({
    data:       z.array(workoutResponseSchema),
    nextCursor: z.string().nullable(),
    hasMore:    z.boolean(),
    total:      z.number(),
});

export type PaginatedHistoryResponse = z.infer<typeof paginatedHistorySchema>;
