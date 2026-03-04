import { Router, type Request, type Response, type RequestHandler } from "express";
import { Movement, MODALITIES, STIMULUS_TAGS } from "../models/Movement.js";
import { authGuard } from "../middleware/auth.js";

const router = Router();

// All movement routes require authentication
router.use(authGuard as unknown as RequestHandler);

// ─── GET /movements ───────────────────────────────────────────────────────
// Query filters: ?modality=G&family=squat&equipment=barbell&bodyweightOnly=true
router.get("/", (async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};

    if (req.query.modality && MODALITIES.includes(req.query.modality as typeof MODALITIES[number])) {
        filter.modality = req.query.modality;
    }

    if (req.query.family) {
        filter.family = req.query.family;
    }

    if (req.query.equipment) {
        // Filter movements that require ANY of the provided equipment
        const equipmentIds = (req.query.equipment as string).split(",");
        filter.equipmentRequired = { $in: equipmentIds };
    }

    if (req.query.bodyweightOnly === "true") {
        filter.bodyweightOnly = true;
    }

    if (req.query.stimulus && STIMULUS_TAGS.includes(req.query.stimulus as typeof STIMULUS_TAGS[number])) {
        filter.stimulusTags = req.query.stimulus;
    }

    if (req.query.level) {
        filter["progressions.level"] = req.query.level;
    }

    const movements = await Movement.find(filter).sort({ name: 1 });
    res.json({ data: movements });
}) as unknown as RequestHandler);

// ─── GET /movements/:id ───────────────────────────────────────────────────
router.get("/:id", (async (req: Request, res: Response) => {
    const movement = await Movement.findById(req.params.id);
    if (!movement) {
        res.status(404).json({ error: "Movement not found" });
        return;
    }
    res.json({ data: movement });
}) as unknown as RequestHandler);

export default router;
