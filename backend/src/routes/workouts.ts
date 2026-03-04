import { Router, type Request, type Response, type RequestHandler } from "express";
import { z } from "zod";
import { Workout } from "../models/Workout.js";
import { User } from "../models/User.js";
import { authGuard } from "../middleware/auth.js";
import { movementFilterService } from "../services/MovementFilterService.js";
import { varianceCheckerService } from "../services/VarianceCheckerService.js";
import { wodAssemblyService } from "../services/WodAssemblyService.js";
import { wodHydrationService } from "../services/scoring/WodHydrationService.js";
import type { FitnessLevel } from "../models/User.js";

const router = Router();

interface AuthenticatedRequest extends Request {
    userId?: string;
}

// All workout routes require authentication
router.use(authGuard as unknown as RequestHandler);

// ─── Generate Request Validation ──────────────────────────────────────────
const generateSchema = z.object({
    category: z.enum(["sprint", "metcon", "long"]),
    equipment: z.array(z.string()),
    injuries: z.string().optional(),
    presetName: z.string().optional(),
    salt: z.string().optional(),
});

// ─── POST /workouts/generate ──────────────────────────────────────────────
// Full pipeline: filter → variance → assemble → save → return
router.post("/generate", (async (req: AuthenticatedRequest, res: Response) => {
    try {
        const payload = generateSchema.parse(req.body);

        // 1. Fetch user AND athlete coaching context in parallel (single DB round-trip for history)
        const [user, athleteContext] = await Promise.all([
            User.findById(req.userId).lean(),
            wodHydrationService.fetch(req.userId!)
        ]);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // 2. Derive variance analysis from the already-fetched context (zero extra DB cost)
        const variance = await varianceCheckerService.analyzeFromContext(athleteContext);

        // 3. Filter movements by equipment + fitness level (in-memory, cached)
        const filtered = await movementFilterService.filter({
            availableEquipment: payload.equipment,
            fitnessLevel: user.fitnessLevel as FitnessLevel,
            bodyweightOnly: payload.equipment.length === 0,
        });

        if (filtered.length === 0) {
            res.status(422).json({
                error:
                    "No movements available for your equipment and fitness level. Try adding more equipment or check the Movement Library.",
            });
            return;
        }

        // 4. Rank movements by freshness (deprioritize recently-used families)
        const ranked = varianceCheckerService.rankByVariance(filtered, variance);

        // 5. Assemble the WOD using the deterministic Coach Engine
        const generated = await wodAssemblyService.assemble(
            ranked,
            payload.category,
            athleteContext,
            req.userId!,
            payload.equipment,
            payload.presetName,
            payload.salt || ""
        );

        // 6. Save to workout history
        const workout = await Workout.create({
            userId: req.userId,
            date: new Date(),
            type: generated.wod.type,
            durationMinutes: generated.wod.duration || 0,
            ...generated,
        });

        // 7. Return to frontend (matching WorkoutResponse schema)
        res.status(201).json({
            data: {
                id: workout.id,
                date: workout.date.toISOString(),
                type: workout.type,
                durationMinutes: workout.durationMinutes,
                completed: workout.completed,
                ...generated,
            },
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.issues[0]?.message || "Invalid request data" });
            return;
        }
        throw err;
    }
}) as unknown as RequestHandler);

// ─── GET /workouts/history ────────────────────────────────────────────────
// Cursor-based pagination: ?limit=20&cursor=<lastId>
// Returns { data, nextCursor, hasMore, total }
const DEFAULT_PAGE_SIZE = 20;

router.get("/history", (async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(
        Math.max(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 1),
        100 // hard cap
    );
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    // Build query
    const filter: Record<string, unknown> = { userId: req.userId };
    if (cursor) {
        filter._id = { $lt: cursor };
    }

    // Fetch one extra to detect if there's a next page
    const [workouts, total] = await Promise.all([
        Workout.find(filter)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .lean(),
        Workout.countDocuments({ userId: req.userId }),
    ]);

    const hasMore = workouts.length > limit;
    const page = hasMore ? workouts.slice(0, limit) : workouts;

    // Transform _id to id for frontend compatibility
    const data = page.map((w) => ({
        ...w,
        id: w._id.toString(),
        date: w.date.toISOString(),
        _id: undefined,
    }));

    const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;

    res.json({ data, nextCursor, hasMore, total });
}) as unknown as RequestHandler);

// ─── POST /workouts/complete ──────────────────────────────────────────────
const completeSchema = z.object({
    workoutId: z.string(),
    completionTime: z.number().optional(),
    roundsOrReps: z.number().optional(),
});

router.post("/complete", (async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { workoutId, completionTime, roundsOrReps } = completeSchema.parse(req.body);

        const workout = await Workout.findOneAndUpdate(
            { _id: workoutId, userId: req.userId },
            {
                $set: {
                    completed: true,
                    ...(completionTime !== undefined && { completionTime }),
                    ...(roundsOrReps !== undefined && { roundsOrReps }),
                },
            },
            { new: true }
        );

        if (!workout) {
            res.status(404).json({ error: "Workout not found" });
            return;
        }

        res.json({ data: { success: true } });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.issues[0]?.message || "Invalid request data" });
            return;
        }
        throw err;
    }
}) as unknown as RequestHandler);

// ─── DELETE /workouts/history ─────────────────────────────────────────────
// Requires { confirm: "DELETE_ALL_HISTORY" } in body to prevent accidental wipes.
const deleteHistorySchema = z.object({
    confirm: z.literal("DELETE_ALL_HISTORY"),
});

router.delete("/history", (async (req: AuthenticatedRequest, res: Response) => {
    try {
        deleteHistorySchema.parse(req.body);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.issues[0]?.message || "Invalid request data" });
            return;
        }
        throw err;
    }

    const result = await Workout.deleteMany({ userId: req.userId });
    res.json({ data: { success: true, deletedCount: result.deletedCount } });
}) as unknown as RequestHandler);

// ─── DELETE /workouts/:id ─────────────────────────────────────────────────
// Delete a single workout by ID (ownership verified).
router.delete("/:id", (async (req: AuthenticatedRequest, res: Response) => {
    const result = await Workout.findOneAndDelete({
        _id: req.params.id,
        userId: req.userId,
    });

    if (!result) {
        res.status(404).json({ error: "Workout not found" });
        return;
    }

    res.json({ data: { success: true } });
}) as unknown as RequestHandler);

export default router;
