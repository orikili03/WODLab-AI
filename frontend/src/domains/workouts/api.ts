import { z } from "zod";

export const movementItemSpecSchema = z.object({
    reps: z.number(),
    isMaxReps: z.boolean().optional(),
    name: z.string(),
    weight: z.string().optional(),
    distance: z.string().optional(),
});

export const workoutSpecSchema = z.object({
    warmup: z.array(z.string()),
    wod: z.object({
        type: z.string(),
        duration: z.number().optional(),
        description: z.string(),
        movements: z.array(z.string()),
        rounds: z.number().optional(),
        movementItems: z.array(movementItemSpecSchema).optional(),
    }),
    finisher: z.array(z.string()).optional(),
    intensityGuidance: z.string(),
    intendedStimulus: z.string().optional(),
    timeDomain: z.string().optional(),
    movementEmphasis: z.array(z.string()).optional(),
    stimulusNote: z.string().optional(),
    energySystem: z.string().optional(),
    primaryStimulus: z.string().optional(),
    equipmentPresetName: z.string().optional(),
    equipmentUsed: z.array(z.string()).optional(),
});

export const workoutResponseSchema = workoutSpecSchema.extend({
    id: z.string(),
    date: z.string(),
    type: z.string(),
    durationMinutes: z.number(),
    completed: z.boolean().optional(),
    completionTime: z.number().optional(),
    roundsOrReps: z.number().optional(),
    timeDomain: z.string().optional(),
});

export type MovementItemSpec = z.infer<typeof movementItemSpecSchema>;
export type WorkoutSpec = z.infer<typeof workoutSpecSchema>;
export type WorkoutResponse = z.infer<typeof workoutResponseSchema>;

export const completeWorkoutPayloadSchema = z.object({
    workoutId: z.string(),
    completionTime: z.number().optional(),
    roundsOrReps: z.number().optional(),
    spec: workoutSpecSchema.optional(),
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
