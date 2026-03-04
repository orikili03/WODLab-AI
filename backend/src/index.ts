import express, { Router, type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { existsSync } from "fs";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import movementRoutes from "./routes/movements.js";
import workoutRoutes from "./routes/workouts.js";
import { movementCacheService } from "./services/MovementCacheService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────
if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // Trust first-hop proxy (Render/Vercel/Cloudflare)
}

app.use(compression()); // Compress all responses
app.use(helmet()); // Set security-related HTTP headers
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ─── Health Check (root-level for load balancer compatibility) ────────────
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes (all under /api/*) ────────────────────────────────────────
const apiRouter = Router();
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/movements", movementRoutes);
apiRouter.use("/workouts", workoutRoutes);
app.use("/api", apiRouter);

// ─── Serve Frontend (SPA Fallback) ────────────────────────────────────────
const frontendPath = path.resolve(__dirname, "../../frontend/dist");
const hasFrontend = existsSync(frontendPath);
const indexHtmlPath = path.join(frontendPath, "index.html");
const hasIndexHtml = hasFrontend && existsSync(indexHtmlPath);

if (hasFrontend) {
    app.use(
        express.static(frontendPath, {
            maxAge: "1d",
            etag: true,
            lastModified: true,
        })
    );
} else {
    console.log("ℹ️ Frontend dist not found. Backend running in API-only mode.");
}

// Catch-all: serve index.html for any GET that isn't an API or health route
app.get("*path", (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
        return next();
    }

    if (hasIndexHtml) {
        res.sendFile(indexHtmlPath);
    } else {
        res.status(404).json({ error: "Not Found", message: "Frontend assets not available on this server." });
    }
});

// ─── Error Handler ────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────
async function start() {
    await connectDB();

    // Eagerly warm up the movement cache
    await movementCacheService.init();

    app.listen(env.PORT, () => {
        console.log(`🚀 WODLab V2 backend running on port ${env.PORT}`);
    });
}

start();
