import "dotenv/config";
import mongoose from "mongoose";
import { Workout } from "../models/Workout.js";

/**
 * Extract February 2026 WOD data for the 3 seeded athletes.
 * Outputs a JSON summary for report generation.
 */

const athletes = [
    { id: "65e5a5a5e5a5a5a5e5a5a511", name: "RX Elite Athlete", level: "rx" },
    { id: "65e5a5a5e5a5a5a5e5a5a522", name: "Scaled Warrior", level: "scaled" },
    { id: "65e5a5a5e5a5a5a5e5a5a533", name: "Beginner Athlete", level: "beginner" },
];

async function extract() {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    for (const athlete of athletes) {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`ATHLETE: ${athlete.name} (${athlete.level})`);
        console.log("=".repeat(80));

        const workouts = await Workout.find({ userId: athlete.id })
            .sort({ completedAt: 1 })
            .lean();

        console.log(`Total workout records: ${workouts.length}`);

        // Count types
        const typeCounts: Record<string, number> = {};
        const protocolCounts: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};
        const durationList: number[] = [];
        const movementFreq: Record<string, number> = {};
        const patternFreq: Record<string, number> = {};
        const modalityFreq: Record<string, number> = {};
        const dayDetails: any[] = [];

        for (const w of workouts) {
            const wod = (w as any).wod;
            const type = wod?.type || (w as any).type || "UNKNOWN";
            typeCounts[type] = (typeCounts[type] || 0) + 1;

            if (type === "REST_DAY") {
                dayDetails.push({
                    date: (w as any).dateString,
                    type: "REST_DAY",
                    protocol: "-",
                    duration: 0,
                    movements: [],
                });
                continue;
            }

            const protocol = wod?.protocol || "UNKNOWN";
            protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;

            const category = (w as any).durationPreference || "UNKNOWN";
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;

            const duration = wod?.duration || (w as any).durationMinutes || 0;
            if (duration > 0) durationList.push(duration);

            const movements: string[] = [];
            if (wod?.movementItems && Array.isArray(wod.movementItems)) {
                for (const mi of wod.movementItems) {
                    const name = mi.name || "Unknown";
                    movements.push(name);
                    movementFreq[name] = (movementFreq[name] || 0) + 1;
                }
            }

            dayDetails.push({
                date: (w as any).dateString,
                type,
                protocol,
                category,
                duration,
                rounds: wod?.rounds,
                movements: movements,
                movementDetails: wod?.movementItems?.map((mi: any) => ({
                    name: mi.name,
                    quantity: mi.quantity,
                    load: mi.load,
                    isMaxReps: mi.isMaxReps,
                })),
            });
        }

        // Avg duration
        const avgDur = durationList.length > 0
            ? (durationList.reduce((a, b) => a + b, 0) / durationList.length).toFixed(1)
            : "N/A";

        // Sort movement frequency
        const topMovements = Object.entries(movementFreq)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15);

        console.log("\n--- TYPE DISTRIBUTION ---");
        console.log(JSON.stringify(typeCounts, null, 2));

        console.log("\n--- PROTOCOL DISTRIBUTION ---");
        console.log(JSON.stringify(protocolCounts, null, 2));

        console.log("\n--- CATEGORY DISTRIBUTION ---");
        console.log(JSON.stringify(categoryCounts, null, 2));

        console.log(`\n--- DURATION ---`);
        console.log(`Avg: ${avgDur} min | Min: ${Math.min(...durationList)} | Max: ${Math.max(...durationList)}`);
        console.log(`All durations: ${JSON.stringify(durationList)}`);

        console.log("\n--- TOP 15 MOVEMENTS ---");
        for (const [name, count] of topMovements) {
            console.log(`  ${name}: ${count}`);
        }

        console.log("\n--- DAY-BY-DAY DETAIL ---");
        for (const d of dayDetails) {
            if (d.type === "REST_DAY") {
                console.log(`  ${d.date} | REST DAY`);
            } else {
                const mvStr = d.movements.join(", ");
                const loadStr = d.movementDetails?.filter((m: any) => m.load).map((m: any) => `${m.name}@${m.load.value}${m.load.unit}`).join(", ") || "bodyweight";
                console.log(`  ${d.date} | ${d.protocol} ${d.duration}min (${d.category}) | ${mvStr} | ${loadStr}`);
            }
        }
    }

    await mongoose.disconnect();
}

extract().catch(console.error);
