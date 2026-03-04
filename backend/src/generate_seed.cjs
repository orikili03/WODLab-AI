const fs = require('fs');

const movementsJson = JSON.parse(fs.readFileSync('C:/Users/oriki/Documents/Dev/WODLab Project/WODLab-V2/.agents/skills/crossfit-programmer/references/movements.json', 'utf8'));

// Existing rich data mapping (simplified for the script, I will expand this)
const existingRichData = {
    "Air Squat": {
        description: "Foundational bodyweight squat.",
        cues: ["Heels down", "Chest up", "Crease below knee"],
        family: "squat",
        stimulusTags: ["endurance", "stamina"]
    },
    "Pull-up": {
        description: "Vertical pulling movement.",
        cues: ["Lats engaged", "Chin over bar", "Full extension"],
        family: "pull",
        stimulusTags: ["strength", "skill"]
    },
    "Push-up": {
        name: "Push-up", // match case
        description: "Horizontal pressing.",
        cues: ["Core tight", "Chest to floor", "Elbows in"],
        family: "press",
        stimulusTags: ["strength", "endurance"]
    },
    "Burpee": {
        description: "Metabolic conditioning.",
        cues: ["Chest to floor", "Jump and clap"],
        family: "full_body",
        stimulusTags: ["endurance", "stamina"]
    },
    "Box Jump": {
        abbreviation: "BJ",
        description: "Explosive jump.",
        cues: ["Land soft", "Stand tall"],
        family: "jump",
        stimulusTags: ["power", "coordination"]
    },
    "Sit-up": {
        description: "AbMat sit-up.",
        cues: ["Touch floor behind head", "Touch toes"],
        family: "core",
        stimulusTags: ["endurance"]
    },
    "Toes-to-Bar": {
        abbreviation: "T2B",
        description: "Hanging abdominal work.",
        cues: ["Big kip", "Toes touch bar"],
        family: "core",
        stimulusTags: ["skill", "stamina"]
    },
    "Ring Muscle-up": {
        abbreviation: "MU",
        description: "Advanced gymnastics on rings.",
        cues: ["Fast turnover", "Lock out dip"],
        family: "pull",
        stimulusTags: ["skill", "power", "strength"]
    },
    "Handstand Push-up": {
        abbreviation: "HSPU",
        description: "Inverted pressing.",
        cues: ["Head forward", "Big kick"],
        family: "press",
        stimulusTags: ["skill", "strength"]
    },
    "Pistol Squat": {
        description: "Single-leg squat.",
        cues: ["Balance", "Heel down"],
        family: "squat",
        stimulusTags: ["skill", "balance", "strength"]
    },
    "Ring Dip": {
        description: "Unstable pressing.",
        cues: ["Rings close", "Full lockout"],
        family: "press",
        stimulusTags: ["strength", "stamina"]
    },
    "Deadlift": {
        abbreviation: "DL",
        description: "Foundational hinge.",
        cues: ["Flat back", "Heels down"],
        family: "hinge",
        stimulusTags: ["strength", "power"],
        defaultLoadKg: { beginner: 20, scaled: 40, rx: 100 },
        isLoaded: true
    },
    "Back Squat": {
        abbreviation: "BS",
        description: "Posterior chain strength.",
        cues: ["Big breath", "Drive up"],
        family: "squat",
        stimulusTags: ["strength"],
        defaultLoadKg: { beginner: 20, scaled: 40, rx: 80 },
        isLoaded: true
    },
    "Front Squat": {
        abbreviation: "FS",
        description: "Anterior load strength.",
        cues: ["Elbows high"],
        family: "squat",
        stimulusTags: ["strength"],
        defaultLoadKg: { beginner: 15, scaled: 30, rx: 60 },
        isLoaded: true
    },
    "Overhead Squat": {
        abbreviation: "OHS",
        description: "Core and shoulder stability.",
        cues: ["Armpits forward"],
        family: "squat",
        stimulusTags: ["skill", "flexibility", "strength"],
        defaultLoadKg: { beginner: 0, scaled: 20, rx: 43 },
        isLoaded: true
    },
    "Strict Press": {
        abbreviation: "SP",
        description: "Strict overhead pressing.",
        cues: ["Core locked"],
        family: "press",
        stimulusTags: ["strength"],
        defaultLoadKg: { beginner: 10, scaled: 20, rx: 40 },
        isLoaded: true
    },
    "Push Press": {
        abbreviation: "PP",
        description: "Dip and drive pressing.",
        cues: ["Heels down on dip"],
        family: "press",
        stimulusTags: ["power", "strength"],
        defaultLoadKg: { beginner: 15, scaled: 30, rx: 50 },
        isLoaded: true
    },
    "Push Jerk": {
        abbreviation: "PJ",
        description: "Dynamic overhead movement.",
        cues: ["Fast drop"],
        family: "press",
        stimulusTags: ["power", "skill"],
        defaultLoadKg: { beginner: 15, scaled: 40, rx: 60 },
        isLoaded: true
    },
    "Power Clean": {
        description: "Olympic pulling.",
        cues: ["Jump and shrug"],
        family: "pull",
        stimulusTags: ["power", "skill", "strength"],
        defaultLoadKg: { beginner: 20, scaled: 40, rx: 60 },
        isLoaded: true
    },
    "Power Snatch": {
        description: "Dynamic full-body power.",
        cues: ["Fast elbows"],
        family: "pull",
        stimulusTags: ["power", "skill", "flexibility"],
        defaultLoadKg: { beginner: 10, scaled: 30, rx: 43 },
        isLoaded: true
    },
    "Thruster": {
        description: "Squat into press.",
        cues: ["One fluid motion"],
        family: "squat",
        stimulusTags: ["power", "stamina"],
        defaultLoadKg: { beginner: 10, scaled: 30, rx: 43 },
        isLoaded: true
    },
    "Kettlebell Swing": {
        abbreviation: "KBS",
        description: "Ballistic hinge.",
        cues: ["Snap hips"],
        family: "hinge",
        stimulusTags: ["power", "endurance"],
        defaultLoadKg: { beginner: 8, scaled: 16, rx: 24 },
        isLoaded: true
    },
    "Wall Ball Shot": {
        abbreviation: "WB",
        description: "Squat and throw.",
        cues: ["Target hit"],
        family: "squat",
        stimulusTags: ["endurance", "stamina"],
        isLoaded: true
    },
    "Sumo Deadlift High Pull": {
        description: "Sumo Deadlift High Pull.",
        cues: ["High elbows"],
        family: "pull",
        stimulusTags: ["power", "stamina"],
        defaultLoadKg: { beginner: 15, scaled: 30, rx: 43 },
        isLoaded: true
    },
    "Dumbbell Snatch": {
        description: "Single-arm power.",
        cues: ["Punch up"],
        family: "pull",
        stimulusTags: ["power", "stamina"],
        isLoaded: true
    },
    "Run": {
        description: "Natural locomotion.",
        cues: ["Midfoot strike"],
        family: "locomotion",
        stimulusTags: ["endurance"]
    },
    "Row": {
        description: "Conditioning pulling.",
        cues: ["Legs-hips-arms"],
        family: "locomotion",
        stimulusTags: ["endurance", "stamina"]
    },
    "Assault Bike": {
        description: "High-intensity bike.",
        cues: ["Push and pull"],
        family: "locomotion",
        stimulusTags: ["endurance", "stamina"]
    },
    "Double Under": {
        abbreviation: "DU",
        description: "Jump rope skill.",
        cues: ["Wrists only"],
        family: "jump",
        stimulusTags: ["coordination", "endurance"]
    }
};

const equipmentMap = {
    "none": [],
    "rower": ["rower"],
    "bike": ["bike_erg"],
    "skierg": ["ski_erg"],
    "jump-rope": ["jump_rope"],
    "barbell": ["barbell"],
    "plates": ["barbell"],
    "dumbbell": ["dumbbells"],
    "kettlebell": ["kettlebells"],
    "pull-up-bar": ["pullup_bar"],
    "rings": ["rings"],
    "box": ["box"],
    "wall": ["wall"],
    "rope": ["rope"],
    "ghd": ["ghd"],
    "wall-ball": ["wall_ball"],
    "med-ball": ["med_ball"],
    "sandbag": ["sandbag"],
    "sled": ["sled"],
    "yoke": ["yoke"],
    "tire": ["tire"],
    "pool": ["pool"]
};

const modalityMap = {
    "monostructural": "M",
    "gymnastics": "G",
    "weightlifting": "W",
    "odd-object": "W"
};

const processedMovements = movementsJson.movements
    .filter(m => m.modality !== "recovery")
    .map(m => {
        const rich = existingRichData[m.name] || {};

        // Map equipment
        let equipment = [];
        if (m.equipment) {
            m.equipment.forEach(e => {
                const mapped = equipmentMap[e];
                if (mapped) equipment = [...equipment, ...mapped];
            });
        }
        equipment = [...new Set(equipment)]; // dedupe (plates + barbell)

        // Map progressions (only if rich data has them or we want to synthesize)
        let progressions = rich.progressions || [];
        // If it's a new movement and we don't have progressions, we'll keep them empty as requested (don't include)

        const result = {
            name: m.name,
            abbreviation: rich.abbreviation || undefined,
            modality: modalityMap[m.modality],
            difficulty: m.difficulty,
            stimulusTags: rich.stimulusTags || m.effects.slice(0, 3), // fallback to effects
            effects: m.effects,
            patterns: m.patterns,
            equipmentRequired: equipment,
            bodyweightOnly: m.equipment.includes("none"),
            family: rich.family || m.patterns[0],
            variants: m.variations,
            isLoaded: rich.isLoaded || false,
            description: rich.description || "",
            cues: rich.cues || []
        };

        if (progressions.length > 0) result.progressions = progressions;
        if (rich.defaultLoadKg) result.defaultLoadKg = rich.defaultLoadKg;

        return result;
    });

const fileHeader = `// Temporary seed script — run once to populate test movements
import "dotenv/config";
import mongoose from "mongoose";
import { Movement } from "./models/Movement.js";

const MONGODB_URI = process.env.MONGODB_URI!;

const testMovements = ${JSON.stringify(processedMovements, null, 4)};

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing test data
    await Movement.deleteMany({});
    console.log("Cleared existing movements");

    // Insert test movements
    const result = await Movement.insertMany(testMovements);
    console.log(\`Seeded \${result.length} movements\`);

    await mongoose.disconnect();
    console.log("Done!");
}

seed().catch(console.error);
`;

fs.writeFileSync('C:/Users/oriki/Documents/Dev/WODLab Project/WODLab-V2/backend/src/seed.ts', fileHeader);
console.log("Seed file generated successfully.");
