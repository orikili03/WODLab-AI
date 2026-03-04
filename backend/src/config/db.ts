import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
    try {
        if (!env.MONGODB_URI) throw new Error("MONGODB_URI is not defined");
        await mongoose.connect(env.MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
}
