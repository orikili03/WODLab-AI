import "dotenv/config";
import mongoose from "mongoose";
import { Workout } from "../models/Workout.js";

async function listWorkouts() {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`Connected to: ${mongoose.connection.name}`);

    // Quick toggle: 11 (RX), 22 (Scaled), 33 (Beginner)
    const MOCK_USER_ID = "65e5a5a5e5a5a5a5e5a5a533";

    const countTotal = await Workout.countDocuments();
    const countUser = await Workout.countDocuments({ userId: MOCK_USER_ID });

    console.log(`Total DB Workouts: ${countTotal}`);
    console.log(`Workouts for Selected User: ${countUser}\n`);

    const workouts = await Workout.find({ userId: MOCK_USER_ID })
        .sort({ date: 1 })
        .limit(31)
        .lean();

    workouts.forEach((w) => {
        const d = new Date(w.date);
        const emoji = w.type === "REST_DAY" ? "💤" : "🔥";
        console.log(`--- [ Day ${d.getDate()} ] ${emoji} ---`);
        console.log(`Date: ${d.toDateString()}`);
        console.log(`Type: ${w.type}`);
        console.log(`Duration: ${w.durationMinutes} min`);
        console.log(`Preset: ${(w as any).equipmentPresetName || "N/A"}`);
        console.log(`Description:\n${(w as any).wod?.description || (w as any).description}`);
        console.log(`-----------------\n`);
    });

    await mongoose.disconnect();
}

listWorkouts();
