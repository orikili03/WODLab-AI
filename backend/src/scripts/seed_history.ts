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
 * Generates 28 days of realistic CrossFit history for three levels:
 * RX, Scaled, and Beginner.
 * This script now follows the 3-on / 1-off Rest Day methodology.
 */
async function seedHistory() {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    await movementCacheService.init();

    // 1. Define Athletes
    const athletes = [
        {
            id: "65e5a5a5e5a5a5a5e5a5a511",
            email: "rx@wodlab.ai",
            name: "RX Elite Athlete",
            level: "rx" as FitnessLevel,
            pattern: [true, true, true, false] // 3-on / 1-off
        },
        {
            id: "65e5a5a5e5a5a5a5e5a5a522",
            email: "scaled@wodlab.ai",
            name: "Scaled Warrior",
            level: "scaled" as FitnessLevel,
            pattern: [true, true, true, false] // 3-on / 1-off
        },
        {
            id: "65e5a5a5e5a5a5a5e5a5a533",
            email: "beginner@wodlab.ai",
            name: "Beginner Athlete",
            level: "beginner" as FitnessLevel,
            pattern: [true, true, false] // 2-on / 1-off
        }
    ];

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash("WODLab2026", salt);
    const EQUIPMENT_IDS = ["pullup_bar", "barbell", "dumbbells", "kettlebells", "box", "jump_rope", "rower"];

    // Clear all existing data
    await Workout.deleteMany({});
    console.log("☢️ NUCLEAR CLEAN: Wiped all workouts.");

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
                workoutDuration: 15,
                equipment: {
                    selected: EQUIPMENT_IDS.map(id => ({ id })),
                    customPresets: []
                },
                goals: ["General Fitness", athlete.level === "rx" ? "Competition" : "Health"]
            },
            { upsert: true }
        );

        for (let day = 1; day <= 28; day++) {
            const date = new Date(2026, 1, day, 10, 0, 0);

            // Check if it's a rest day based on the athlete's pattern
            const isWorkDay = athlete.pattern[(day - 1) % athlete.pattern.length];

            if (!isWorkDay) {
                // Record a Rest Day in the DB
                await Workout.create({
                    userId: athlete.id,
                    createdAt: date,
                    date: date,
                    completed: true,
                    type: "REST_DAY",
                    durationMinutes: 0,
                    wod: {
                        type: "REST_DAY",
                        description: "Full Recovery Day. Focus on mobility, hydration, and sleep.",
                        movements: []
                    },
                    warmup: ["5 min Light Walk", "10 min Full Body Mobility"],
                    intensityGuidance: "Zero intensity. Let the nervous system recover."
                });
                continue;
            }

            // Normal Generation Logic
            const category = categories[(day - 1) % categories.length];
            const context = await wodHydrationService.fetch(athlete.id, date);
            const variance = await varianceCheckerService.analyzeFromContext(context);

            const PRESET_NAME = "Full Garage";
            const filtered = await movementFilterService.filter({
                availableEquipment: EQUIPMENT_IDS,
                fitnessLevel: athlete.level,
                bodyweightOnly: false
            });

            const ranked = varianceCheckerService.rankByVariance(filtered, variance);

            const generated = await wodAssemblyService.assemble(
                ranked,
                category,
                context,
                athlete.id,
                EQUIPMENT_IDS,
                PRESET_NAME,
                "",
                date
            );

            await Workout.create({
                userId: athlete.id,
                createdAt: date,
                date: date,
                completed: true,
                type: generated.wod.type,
                durationMinutes: generated.wod.duration || 0,
                ...generated,
            });
        }
        console.log(`✅ ${athlete.name} Complete.`);
    }

    console.log("\n✨ All Athletes Seeded successfully!");
    console.log("RX: rx@wodlab.ai");
    console.log("Scaled: scaled@wodlab.ai");
    console.log("Beginner: beginner@wodlab.ai");
    console.log("Password for all: WODLab2026");

    await mongoose.disconnect();
}

seedHistory().catch(console.error);
