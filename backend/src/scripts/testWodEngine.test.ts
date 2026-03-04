import "dotenv/config";
import mongoose from "mongoose";
import { wodAssemblyService, type WodCategory } from "../services/WodAssemblyService.js";
import { movementCacheService } from "../services/MovementCacheService.js";
import { movementFilterService } from "../services/MovementFilterService.js";
import { varianceCheckerService } from "../services/VarianceCheckerService.js";
import type { HydratedContext, HistoricalSession as RecentSession } from "../services/scoring/WodHydrationService.js";
import type { Modality } from "../models/Movement.js";

const DAYS_TO_SIMULATE = 30;

const MOCK_ATHLETE = {
    userId: new mongoose.Types.ObjectId().toString(),
    fitnessLevel: "rx" as const,
    equipment: [
        "pullup_bar", "barbell", "dumbbells", "kettlebells",
        "box", "jump_rope", "rower", "rings", "wall_ball"
    ],
    goals: ["engine", "strength"],
};

describe("WOD Engine Monte Carlo Simulation", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/wodlab");
        await movementCacheService.init();
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    it(`Simulates ${DAYS_TO_SIMULATE} days with zero equipment violations and accurate duration`, async () => {
        const allMovements = await movementCacheService.getAll();

        const context: HydratedContext = {
            isColdStart: true,
            fitnessLevel: MOCK_ATHLETE.fitnessLevel,
            goals: MOCK_ATHLETE.goals,
            history: []
        };

        const availableMovements = await movementFilterService.filter({
            availableEquipment: MOCK_ATHLETE.equipment,
            fitnessLevel: MOCK_ATHLETE.fitnessLevel,
            bodyweightOnly: false
        });

        let equipmentViolations = 0;
        const categories: WodCategory[] = ["sprint", "metcon", "long"];

        for (let day = 1; day <= DAYS_TO_SIMULATE; day++) {
            const variance = await varianceCheckerService.analyzeFromContext(context);
            const rankedCandidates = varianceCheckerService.rankByVariance(availableMovements, variance);

            // Randomly pick category per user request
            const category = categories[Math.floor(Math.random() * categories.length)];

            let generated;
            let dayMovements: string[] = [];
            let dayModalities: Modality[] = [];
            let dayFamilies: string[] = [];
            let retryCount = 0;
            let hasViolation = false;

            while (true) {
                generated = await wodAssemblyService.assemble(
                    rankedCandidates,
                    category,
                    context,
                    MOCK_ATHLETE.userId + "_day" + day + "_retry" + retryCount,
                    MOCK_ATHLETE.equipment
                );

                dayMovements = [];
                dayModalities = [];
                dayFamilies = [];

                for (const item of generated.wod.movementItems) {
                    const libraryRef = allMovements.find(m => m.name === item.name);
                    if (libraryRef) {
                        dayModalities.push(libraryRef.modality as Modality);
                        if (libraryRef.family) dayFamilies.push(libraryRef.family);
                        dayMovements.push(libraryRef.name);
                    }
                }

                hasViolation = false;
                if (context.history.length > 0) {
                    const yesterday = context.history[0];
                    const intersection = dayMovements.filter(m => yesterday.movementNames.includes(m));
                    if (intersection.length > 0) {
                        hasViolation = true;
                        retryCount++;
                    }
                }
                if (!hasViolation) break;
            }

            // Check equipment violation
            for (const item of generated.wod.movementItems) {
                const libEq = allMovements.find(m => m.name === item.name)?.equipmentRequired ?? [];
                if (libEq.length > 0) {
                    const hasAll = libEq.every(eq => MOCK_ATHLETE.equipment.includes(eq));
                    if (!hasAll) {
                        equipmentViolations++;
                    }
                }
            }

            // Assert duration within category range
            const duration = generated.wod.duration || 0;
            if (category === "sprint") {
                expect(duration).toBeGreaterThanOrEqual(4);
                expect(duration).toBeLessThanOrEqual(7);
            } else if (category === "metcon") {
                expect(duration).toBeGreaterThanOrEqual(8);
                expect(duration).toBeLessThanOrEqual(20);
            } else if (category === "long") {
                expect(duration).toBeGreaterThanOrEqual(25);
                expect(duration).toBeLessThanOrEqual(40);
            }

            const newSession: RecentSession = {
                date: new Date(Date.now() + (day * 86400000)),
                movementNames: dayMovements,
                patterns: dayFamilies,
                modalities: dayModalities,
                ageHours: 24
            };

            context.history.unshift(newSession);
            if (context.history.length > 5) {
                context.history.pop();
            }
            context.isColdStart = false;
        }

        expect(equipmentViolations).toBe(0);
    }, 60000);
});
