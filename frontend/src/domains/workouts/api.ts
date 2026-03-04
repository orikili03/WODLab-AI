import { z } from "zod";

// ─── Structured Movement Quantity & Load ──────────────────────────────────
export const quantitySchema = z.object({
    value: z.number(),
    unit: z.string(),    // "reps" | "m" | "cal" | "sec"
});

export const loadSchema = z.object({
    value: z.number(),
    unit: z.string(),    // "kg" | "lb"
});

// ─── Movement Item (structured movement within a WOD) ─────────────────────
export const movementItemSpecSchema = z.object({
    movementId: z.string().optional(),
    family: z.string().optional(),
    name: z.string(),
    quantity: quantitySchema,
    load: loadSchema.optional(),
    isMaxReps: z.boolean().optional(),
});

// ─── WOD Spec (core workout structure) ────────────────────────────────────
export const wodSchema = z.object({
    type: z.string(),
    protocol: z.string().optional(),
    category: z.string().optional(),
    duration: z.number().optional(),
    rounds: z.number().optional(),
    movementItems: z.array(movementItemSpecSchema),
    ladderType: z.string().optional(),
    scoringType: z.string().optional(),
});

// ─── Workout Spec (what the backend generates) ────────────────────────────
export const workoutSpecSchema = z.object({
    wod: wodSchema,
    equipmentPresetName: z.string().optional(),
    equipmentUsed: z.array(z.string()).optional(),
});

// ─── Full Workout Response (from DB, includes tracking fields) ────────────
export const workoutResponseSchema = z.object({
    // --- Identification ---
    id: z.string(),
    wodId: z.string(),

    // --- Timing ---
    dateString: z.string(),
    timeString: z.string(),

    // --- User Preferences ---
    durationPreference: z.string(),

    // --- Equipment Context ---
    equipmentPresetName: z.string().optional(),
    equipmentUsed: z.array(z.string()).optional(),

    // --- Protocol ---
    type: z.string(),
    durationMinutes: z.number(),

    // --- Core WOD Structure ---
    wod: wodSchema,

    // --- Performance Tracking ---
    completedAt: z.string().nullable().optional(),
    scoreValue: z.number().optional(),
    scoreString: z.string().optional(),
    rpe: z.number().optional(),
});

export type Quantity = z.infer<typeof quantitySchema>;
export type Load = z.infer<typeof loadSchema>;
export type MovementItemSpec = z.infer<typeof movementItemSpecSchema>;
export type WodSpec = z.infer<typeof wodSchema>;
export type WorkoutSpec = z.infer<typeof workoutSpecSchema>;
export type WorkoutResponse = z.infer<typeof workoutResponseSchema>;

// ─── Complete Workout Payload ─────────────────────────────────────────────
export const completeWorkoutPayloadSchema = z.object({
    workoutId: z.string(),
    scoreValue: z.number().optional(),
    scoreString: z.string().optional(),
    rpe: z.number().min(1).max(5).optional(),
});

export type CompleteWorkoutPayload = z.infer<typeof completeWorkoutPayloadSchema>;

// ─── Paginated History Response ───────────────────────────────────────────
export const paginatedHistorySchema = z.object({
    data: z.array(workoutResponseSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    total: z.number(),
});

export type PaginatedHistoryResponse = z.infer<typeof paginatedHistorySchema>;
