import { Router, type Request, type Response, type RequestHandler } from "express";
import { z } from "zod";
import { User, FITNESS_LEVELS } from "../models/User.js";
import { authGuard } from "../middleware/auth.js";

const router = Router();

interface AuthenticatedRequest extends Request {
    userId?: string;
}

// All user routes require authentication
router.use(authGuard as unknown as RequestHandler);

// ─── Validation Schemas ───────────────────────────────────────────────────
const updateProfileSchema = z.object({
    fitnessLevel: z.enum(FITNESS_LEVELS).optional(),
    goals: z.array(z.string()).optional(),
});

const equipmentSelectionSchema = z.object({
    id: z.string(),
    minWeight: z.number().optional(),
    maxWeight: z.number().optional(),
});

const customPresetSchema = z.object({
    id: z.string(),
    name: z.string(),
    selected: z.array(equipmentSelectionSchema),
});

const equipmentStateSchema = z.object({
    selected: z.array(equipmentSelectionSchema),
    customPresets: z.array(customPresetSchema),
});

// ─── GET /users/me ────────────────────────────────────────────────────────
router.get("/me", (async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    res.json({
        data: {
            id: user.id,
            email: user.email,
            fitnessLevel: user.fitnessLevel,
            equipment: user.equipment,
            goals: user.goals,
        },
    });
}) as unknown as RequestHandler);

// ─── PUT /users/me ────────────────────────────────────────────────────────
router.put("/me", (async (req: AuthenticatedRequest, res: Response) => {
    try {
        const updates = updateProfileSchema.parse(req.body);

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-passwordHash");

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json({
            data: {
                id: user.id,
                email: user.email,
                fitnessLevel: user.fitnessLevel,
                equipment: user.equipment,
                goals: user.goals,
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

// ─── PUT /users/me/equipment ──────────────────────────────────────────────
router.put("/me/equipment", (async (req: AuthenticatedRequest, res: Response) => {
    try {
        const equipmentState = equipmentStateSchema.parse(req.body);

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: { equipment: equipmentState } },
            { new: true, runValidators: true }
        ).select("-passwordHash");

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json({
            data: {
                equipment: user.equipment,
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

export default router;
