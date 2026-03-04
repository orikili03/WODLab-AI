import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

let envData;
try {
    envData = envSchema.parse(process.env);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error("❌ Invalid environment variables:");
        console.error(error.format());
    } else {
        console.error("❌ Environment parsing error:", error);
    }
    process.exit(1);
}

export const env = envData;
