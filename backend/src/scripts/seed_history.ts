import "dotenv/config";
import mongoose from "mongoose";
import { User, type FitnessLevel } from "../models/User.js";
import { Workout } from "../models/Workout.js";
import { wodAssemblyService, type WodCategory } from "../services/WodAssemblyService.js";
import { wodHydrationService } from "../services/scoring/WodHydrationService.js";
import { movementFilterService } from "../services/MovementFilterService.js";
import { varianceCheckerService } from "../services/VarianceCheckerService.js";
import { movementCacheService } from "../services/MovementCacheService.js";
import bcrypt from "bcryptjs";

/**
 * MULTI-ATHLETE HISTORY SEEDER
 * Generates 28 days of realistic CrossFit history for three test athletes.
 * Follows the 3-on / 1-off Rest Day methodology.
 *
 * Run from WODLab-V2/backend/:
 *   npx tsx src/scripts/seed_history.ts
 */

// ─── Helper: mirrors buildWodMeta from routes/workouts.ts ─────────────────
function buildWodMeta(userId: string, date: Date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return {
        wodId: `${userId}-${dd}${mm}${yyyy}-${hh}${min}${ss}`,
        dateString: `${dd}/${mm}/${yyyy}`,
        timeString: `${hh}:${min}`,
    };
}

async function seedHistory() {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    await movementCacheService.init();

    // 1. Define Athletes
    // FitnessLevel enum is "beginner" | "rx" only — "scaled" maps to "beginner"
    const athletes = [
        {
            id: "65e5a5a5e5a5a5a5e5a5a511",
            email: "rx@wodlab.ai",
            name: "RX Elite Athlete",
            level: "rx" as FitnessLevel,
            pattern: [true, true, true, false], // 3-on / 1-off
        },
        {
            id: "65e5a5a5e5a5a5a5e5a5a522",
            email: "scaled@wodlab.ai",
            name: "Scaled Warrior",
            level: "beginner" as FitnessLevel, // "scaled" maps to "beginner" in this system
            pattern: [true, true, true, false], // 3-on / 1-off
        },
        {
            id: "65e5a5a5e5a5a5a5e5a5a533",
            email: "beginner@wodlab.ai",
            name: "Beginner Athlete",
            level: "beginner" as FitnessLevel,
            pattern: [true, true, false], // 2-on / 1-off
        },
    ];

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash("WODLab2026", salt);
    const EQUIPMENT_IDS = ["pullup_bar", "barbell", "dumbbells", "kettlebells", "box", "jump_rope", "rower"];

    // Clear all existing workout data
    await Workout.deleteMany({});
    console.log("☢️  NUCLEAR CLEAN: Wiped all workouts.");

    const categories: WodCategory[] = ["metcon", "sprint", "metcon", "long", "metcon", "sprint", "metcon"];

    for (const athlete of athletes) {
        console.log(`\n🏃 Seeding history for: ${athlete.name} (${athlete.level})...`);

        // Upsert User
        await User.findOneAndUpdate(
            { _id: athlete.id },
            {
                name: athlete.name,
                email: athlete.email,
                passwordHash,
                fitnessLevel: athlete.level,
                equipment: {
                    selected: EQUIPMENT_IDS.map((id) => ({ id })),
                    customPresets: [],
                },
                goals: ["General Fitness", athlete.level === "rx" ? "Competition" : "Health"],
            },
            { upsert: true }
        );

        for (let day = 1; day <= 28; day++) {
            const date = new Date(2026, 1, day, 10, 0, 0);
            const meta = buildWodMeta(athlete.id, date);
            const isWorkDay = athlete.pattern[(day - 1) % athlete.pattern.length];

            if (!isWorkDay) {
                // Record a Rest Day — minimal valid Workout document
                await Workout.create({
                    wodId: meta.wodId,
                    userId: athlete.id,
                    dateString: meta.dateString,
                    timeString: meta.timeString,
                    type: "REST_DAY",
                    durationPreference: "rest",
                    durationMinutes: 0,
                    completedAt: date,
                    wod: {
                        type: "REST_DAY",
                        movementItems: [],
                    },
                });
                continue;
            }

            // Normal Generation Logic
            const category = categories[(day - 1) % categories.length];
            const context = await wodHydrationService.fetch(athlete.id, date);
            const variance = await varianceCheckerService.analyzeFromContext(context);

            const filtered = await movementFilterService.filter({
                availableEquipment: EQUIPMENT_IDS,
                fitnessLevel: athlete.level,
                bodyweightOnly: false,
            });

            const ranked = varianceCheckerService.rankByVariance(filtered, variance);

            const generated = await wodAssemblyService.assemble(
                ranked,
                category,
                context,
                athlete.id,
                EQUIPMENT_IDS,
                "Full Garage",
                "",
                date
            );

            await Workout.create({
                wodId: meta.wodId,
                userId: athlete.id,
                dateString: meta.dateString,
                timeString: meta.timeString,
                type: generated.wod.type,
                durationPreference: category,
                durationMinutes: generated.wod.duration || 0,
                completedAt: date,
                ...generated,
            });
        }
        console.log(`✅ ${athlete.name} Complete.`);
    }

    console.log("\n✨ All Athletes Seeded successfully!");
    console.log("RX:       rx@wodlab.ai");
    console.log("Scaled:   scaled@wodlab.ai");
    console.log("Beginner: beginner@wodlab.ai");
    console.log("Password for all: WODLab2026");

    await mongoose.disconnect();
}

seedHistory().catch(console.error);
