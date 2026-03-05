import "dotenv/config";
import mongoose from "mongoose";
import { User, type FitnessLevel } from "../models/User.js";
import { Workout } from "../models/Workout.js";
import { wodAssemblyService, type WodCategory, type WodProtocol } from "../services/WodAssemblyService.js";
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

// ─── Deterministic RNG (LCG — no external dep) ────────────────────────────
function makeRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967295;
    };
}

// ─── Completion Stats Types ───────────────────────────────────────────────
interface SessionStats {
    totalSeconds?: number;
    rx: boolean;
}

interface CompletionStats {
    session: SessionStats;
    rpe: number;
    // Internal data used by buildPerformedForItem — not written to DB directly
    _rounds?: number;             // AMRAP / EMOM / DEATH_BY / LADDER rounds
    _tabataRepsPerInterval?: number;
    _strengthKg?: number;         // STRENGTH_SINGLE / STRENGTH_SETS kg lifted
    _forTimeRounds?: number;      // FOR_TIME / CHIPPER rounds
}

// ─── Session Stats Generator ──────────────────────────────────────────────
function generateCompletionStats(
    protocol: WodProtocol,
    category: WodCategory,
    durationMinutes: number,
    fitnessLevel: FitnessLevel,
    daySeed: number,
    wodRounds?: number,
): CompletionStats {
    const rng = makeRng(daySeed);
    const isRx = fitnessLevel === "rx";
    const rx = true; // all seeded workouts marked as completed at prescribed weight

    // RPE: 1–5 scale
    const rpeBase: Record<WodCategory, [number, number]> = {
        sprint: [4, 5],
        metcon: isRx ? [3, 5] : [3, 4],
        long: [3, 4],
    };
    const [rpeMin, rpeMax] = rpeBase[category];
    const rpe = Math.round(rpeMin + rng() * (rpeMax - rpeMin));

    const dur = durationMinutes || 10;

    switch (protocol) {
        case "AMRAP": {
            const roundsPerMin = isRx ? 0.48 + rng() * 0.14 : 0.33 + rng() * 0.10;
            const rounds = Math.max(1, Math.round(dur * roundsPerMin));
            // AMRAP runs for the full prescribed duration
            return { session: { totalSeconds: dur * 60, rx }, rpe, _rounds: rounds };
        }
        case "FOR_TIME":
        case "CHIPPER": {
            const pct = isRx ? 0.62 + rng() * 0.16 : 0.78 + rng() * 0.15;
            const totalSec = Math.round(dur * pct * 60);
            return { session: { totalSeconds: totalSec, rx }, rpe, _forTimeRounds: wodRounds ?? 1 };
        }
        case "21_15_9": {
            const pct = isRx ? 0.62 + rng() * 0.16 : 0.78 + rng() * 0.15;
            const totalSec = Math.round(dur * pct * 60);
            return { session: { totalSeconds: totalSec, rx }, rpe };
        }
        case "EMOM": {
            // EMOM runs for exactly dur minutes
            return { session: { totalSeconds: dur * 60, rx }, rpe, _rounds: dur };
        }
        case "TABATA": {
            const repsPerInterval = isRx ? Math.round(11 + rng() * 6) : Math.round(7 + rng() * 5);
            // Standard TABATA: 8 intervals × 30 s = 4 min
            return { session: { totalSeconds: 8 * 30, rx }, rpe, _tabataRepsPerInterval: repsPerInterval };
        }
        case "DEATH_BY": {
            const round = isRx ? Math.round(13 + rng() * 5) : Math.round(8 + rng() * 6);
            // Each DEATH_BY round = 1 minute; athlete works until failure
            return { session: { totalSeconds: round * 60, rx }, rpe, _rounds: round };
        }
        case "LADDER": {
            const round = isRx ? Math.round(9 + rng() * 5) : Math.round(5 + rng() * 5);
            // Same cadence as DEATH_BY — 1 round per minute
            return { session: { totalSeconds: round * 60, rx }, rpe, _rounds: round };
        }
        case "STRENGTH_SINGLE": {
            const kg = isRx ? Math.round(85 + rng() * 35) : Math.round(40 + rng() * 30);
            return { session: { rx }, rpe, _strengthKg: kg };
        }
        case "STRENGTH_SETS": {
            const kg = isRx ? Math.round(65 + rng() * 35) : Math.round(30 + rng() * 30);
            return { session: { rx }, rpe, _strengthKg: kg };
        }
        case "INTERVAL": {
            const avgSec = isRx ? Math.round(52 + rng() * 20) : Math.round(68 + rng() * 25);
            const intervalCount = Math.max(1, Math.round(dur / (avgSec / 60)));
            return { session: { totalSeconds: avgSec * intervalCount, rx }, rpe, _rounds: intervalCount };
        }
        default:
            return { session: { rx }, rpe };
    }
}

// ─── Per-Movement Performed Builder ───────────────────────────────────────
interface PerformedData {
    volume?: { repsPerRound: number[]; totalReps: number };
    load?: number;
}

function buildPerformedForItem(
    protocol: WodProtocol,
    stats: CompletionStats,
    item: { quantity: { value: number; unit: string }; load?: number },
): PerformedData | undefined {
    const prescribedReps = item.quantity.unit === "reps" ? item.quantity.value : undefined;
    const prescribedLoad = item.load;

    const withLoad = (data: Omit<PerformedData, "load">): PerformedData =>
        prescribedLoad !== undefined ? { ...data, load: prescribedLoad } : data;

    switch (protocol) {
        case "AMRAP": {
            if (!prescribedReps || !stats._rounds) return prescribedLoad !== undefined ? { load: prescribedLoad } : undefined;
            const arr = Array<number>(stats._rounds).fill(prescribedReps);
            return withLoad({ volume: { repsPerRound: arr, totalReps: stats._rounds * prescribedReps } });
        }
        case "FOR_TIME":
        case "CHIPPER": {
            const rounds = stats._forTimeRounds ?? 1;
            if (!prescribedReps) return prescribedLoad !== undefined ? { load: prescribedLoad } : undefined;
            const arr = Array<number>(rounds).fill(prescribedReps);
            return withLoad({ volume: { repsPerRound: arr, totalReps: rounds * prescribedReps } });
        }
        case "21_15_9": {
            if (!prescribedReps) return prescribedLoad !== undefined ? { load: prescribedLoad } : undefined;
            return withLoad({ volume: { repsPerRound: [21, 15, 9], totalReps: 45 } });
        }
        case "EMOM": {
            if (!prescribedReps || !stats._rounds) return undefined;
            const arr = Array<number>(stats._rounds).fill(prescribedReps);
            return { volume: { repsPerRound: arr, totalReps: stats._rounds * prescribedReps } };
        }
        case "TABATA": {
            const rpi = stats._tabataRepsPerInterval ?? 10;
            const arr = Array<number>(8).fill(rpi);
            return { volume: { repsPerRound: arr, totalReps: rpi * 8 } };
        }
        case "DEATH_BY":
        case "LADDER": {
            const maxRound = stats._rounds ?? 0;
            if (maxRound <= 0) return undefined;
            const arr = Array.from({ length: maxRound }, (_, i) => i + 1);
            const totalReps = (maxRound * (maxRound + 1)) / 2;
            return { volume: { repsPerRound: arr, totalReps } };
        }
        case "STRENGTH_SINGLE": {
            return stats._strengthKg !== undefined ? { load: stats._strengthKg } : undefined;
        }
        case "STRENGTH_SETS": {
            const arr = Array<number>(5).fill(5);
            const base: PerformedData = { volume: { repsPerRound: arr, totalReps: 25 } };
            return stats._strengthKg !== undefined ? { ...base, load: stats._strengthKg } : base;
        }
        case "INTERVAL": {
            if (!prescribedReps || !stats._rounds) return undefined;
            const arr = Array<number>(stats._rounds).fill(prescribedReps);
            return { volume: { repsPerRound: arr, totalReps: stats._rounds * prescribedReps } };
        }
        default:
            return undefined;
    }
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

            const stats = generateCompletionStats(
                generated.wod.protocol,
                category,
                generated.wod.duration || 0,
                athlete.level,
                date.getTime(),
                generated.wod.rounds,
            );

            // Enrich movementItems with performed data
            const enrichedMovementItems = generated.wod.movementItems.map((item) => ({
                ...item,
                performed: buildPerformedForItem(generated.wod.protocol, stats, item),
            }));

            await Workout.create({
                wodId: meta.wodId,
                userId: athlete.id,
                dateString: meta.dateString,
                timeString: meta.timeString,
                type: generated.wod.type,
                durationPreference: category,
                durationMinutes: generated.wod.duration || 0,
                completedAt: date,
                wod: { ...generated.wod, movementItems: enrichedMovementItems },
                equipmentPresetName: generated.equipmentPresetName,
                equipmentUsed: generated.equipmentUsed,
                session: stats.session,
                rpe: stats.rpe,
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
