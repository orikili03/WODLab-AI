import { Router, type Request, type Response, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { User } from "../models/User.js";
import { signToken, setAuthCookie, clearAuthCookie, authGuard } from "../middleware/auth.js";
import { env } from "../config/env.js";

const router = Router();

interface AuthenticatedRequest extends Request {
    userId?: string;
}

// ─── Rate Limiters ────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { error: "Too many login/registration attempts, please try again after 15 minutes" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Protect all auth routes with the limiter (disabled in development)
if (env.NODE_ENV !== "development") {
    router.use(authLimiter);
}

// ─── Validation Schemas ───────────────────────────────────────────────────
const registerSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
});

// ─── POST /auth/register ──────────────────────────────────────────────────
router.post("/register", (async (req: Request, res: Response) => {
    try {
        const { email, password } = registerSchema.parse(req.body);

        // Check for existing user
        const existing = await User.findOne({ email });
        if (existing) {
            res.status(409).json({ error: "Email already registered" });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({ email, passwordHash });

        // Set HttpOnly cookie + Return token for mobile/headers fallback
        const token = signToken(user.id, user.email);
        setAuthCookie(res, token);

        res.status(201).json({
            user: { id: user.id, email: user.email },
            token
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.issues[0]?.message || "Invalid request data" });
            return;
        }
        throw err;
    }
}) as unknown as RequestHandler);

// ─── POST /auth/login ─────────────────────────────────────────────────────
router.post("/login", (async (req: Request, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        // Set HttpOnly cookie + Return token for mobile/headers fallback
        const token = signToken(user.id, user.email);
        setAuthCookie(res, token);

        res.json({
            user: { id: user.id, email: user.email },
            token
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.issues[0]?.message || "Invalid request data" });
            return;
        }
        throw err;
    }
}) as unknown as RequestHandler);

// ─── POST /auth/logout ───────────────────────────────────────────────────
router.post("/logout", ((_req: Request, res: Response) => {
    clearAuthCookie(res);
    res.json({ success: true });
}) as unknown as RequestHandler);

// ─── GET /auth/me — Lightweight session check ────────────────────────────
router.get("/me", authGuard as unknown as RequestHandler, (async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.userId).select("email");
    if (!user) {
        clearAuthCookie(res);
        res.status(401).json({ error: "User not found" });
        return;
    }
    res.json({ user: { id: user.id, email: user.email } });
}) as unknown as RequestHandler);

export default router;

