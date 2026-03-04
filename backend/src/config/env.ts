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

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    process.exit(1);
}

export const env = result.data;
