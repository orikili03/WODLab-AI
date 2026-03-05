// Temporary seed script — run once to populate test movements
import "dotenv/config";
import mongoose from "mongoose";
import { Movement } from "../models/Movement.js";

const MONGODB_URI = process.env.MONGODB_URI!;

const testMovements = [
    {
        "name": "Run",
        "modality": "M",
        "difficulty": "beginner",
        "stimulusTags": [
            "endurance"
        ],
        "effects": [
            "engine",
            "stamina",
            "recovery"
        ],
        "patterns": [
            "cyclical",
            "aerobic",
            "knee-dominant"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "locomotion",
        "variants": [
            "Easy nasal-breathing run",
            "Tempo run",
            "Hill run",
            "Weighted vest run",
            "Shuttle run repeats"
        ],
        "isLoaded": false,
        "description": "Natural locomotion.",
        "cues": [
            "Midfoot strike"
        ]
    },
    {
        "name": "Sprint Run",
        "modality": "M",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "speed",
            "engine"
        ],
        "effects": [
            "power",
            "speed",
            "engine"
        ],
        "patterns": [
            "cyclical",
            "anaerobic",
            "power"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "cyclical",
        "variants": [
            "40 m accelerations",
            "100 m repeats",
            "200 m repeats",
            "Up-hill sprint",
            "Build sprint"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Shuttle Run",
        "modality": "M",
        "difficulty": "beginner",
        "stimulusTags": [
            "engine",
            "agility",
            "stamina"
        ],
        "effects": [
            "engine",
            "agility",
            "stamina"
        ],
        "patterns": [
            "cyclical",
            "lateral",
            "change-of-direction"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "cyclical",
        "variants": [
            "5-10-15 m shuttle",
            "20 m shuttle",
            "Suicides",
            "Reactive shuttle",
            "Partner chase shuttle"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Row",
        "modality": "M",
        "difficulty": "beginner",
        "stimulusTags": [
            "endurance",
            "stamina"
        ],
        "effects": [
            "engine",
            "stamina",
            "power"
        ],
        "patterns": [
            "cyclical",
            "hinge",
            "pull"
        ],
        "equipmentRequired": [
            "rower"
        ],
        "bodyweightOnly": false,
        "family": "locomotion",
        "variants": [
            "Steady state row",
            "Calorie row intervals",
            "Distance row",
            "Stroke-rate ladder",
            "Damper technique row"
        ],
        "isLoaded": false,
        "description": "Conditioning pulling.",
        "cues": [
            "Legs-hips-arms"
        ]
    },
    {
        "name": "Bike Erg",
        "modality": "M",
        "difficulty": "beginner",
        "stimulusTags": [
            "engine",
            "stamina",
            "recovery"
        ],
        "effects": [
            "engine",
            "stamina",
            "recovery"
        ],
        "patterns": [
            "cyclical",
            "knee-dominant"
        ],
        "equipmentRequired": [
            "bike_erg"
        ],
        "bodyweightOnly": false,
        "family": "cyclical",
        "variants": [
            "Easy flush bike",
            "Sprint bike",
            "RPM ladder",
            "Threshold bike",
            "Bike standing surge"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Assault Bike",
        "modality": "M",
        "difficulty": "intermediate",
        "stimulusTags": [
            "endurance",
            "stamina"
        ],
        "effects": [
            "engine",
            "power",
            "mental"
        ],
        "patterns": [
            "cyclical",
            "full-body"
        ],
        "equipmentRequired": [
            "bike_erg"
        ],
        "bodyweightOnly": false,
        "family": "locomotion",
        "variants": [
            "10/20 second repeats",
            "Max-cal sprint",
            "Negative split effort",
            "Bike tabata",
            "Long interval bike"
        ],
        "isLoaded": false,
        "description": "High-intensity bike.",
        "cues": [
            "Push and pull"
        ]
    },
    {
        "name": "SkiErg",
        "modality": "M",
        "difficulty": "intermediate",
        "stimulusTags": [
            "engine",
            "stamina",
            "upper-body-endurance"
        ],
        "effects": [
            "engine",
            "stamina",
            "upper-body-endurance"
        ],
        "patterns": [
            "cyclical",
            "hinge",
            "vertical-pull"
        ],
        "equipmentRequired": [
            "ski_erg"
        ],
        "bodyweightOnly": false,
        "family": "cyclical",
        "variants": [
            "Steady ski",
            "Calorie sprints",
            "Double-pole focus",
            "Rate-control ski",
            "Alternating-arm ski"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Jump Rope Single",
        "modality": "M",
        "difficulty": "beginner",
        "stimulusTags": [
            "engine",
            "coordination",
            "recovery"
        ],
        "effects": [
            "engine",
            "coordination",
            "recovery"
        ],
        "patterns": [
            "cyclical",
            "coordination",
            "elasticity"
        ],
        "equipmentRequired": [
            "jump_rope"
        ],
        "bodyweightOnly": false,
        "family": "cyclical",
        "variants": [
            "Single unders",
            "Alternating foot single unders",
            "High-knee singles",
            "Side-to-side singles",
            "Fast cadence singles"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Double Under",
        "abbreviation": "DU",
        "modality": "M",
        "difficulty": "advanced",
        "stimulusTags": [
            "coordination",
            "endurance"
        ],
        "effects": [
            "engine",
            "coordination",
            "skill"
        ],
        "patterns": [
            "cyclical",
            "coordination",
            "elasticity"
        ],
        "equipmentRequired": [
            "jump_rope"
        ],
        "bodyweightOnly": false,
        "family": "jump",
        "variants": [
            "Single-single-double",
            "Unbroken double unders",
            "Cross-over double under",
            "Alternating double under",
            "Double under speed sets"
        ],
        "isLoaded": false,
        "description": "Jump rope skill.",
        "cues": [
            "Wrists only"
        ]
    },
    {
        "name": "Swim",
        "modality": "M",
        "difficulty": "intermediate",
        "stimulusTags": [
            "engine",
            "recovery",
            "stamina"
        ],
        "effects": [
            "engine",
            "recovery",
            "stamina"
        ],
        "patterns": [
            "cyclical",
            "aerobic",
            "upper-pull"
        ],
        "equipmentRequired": [
            "pool"
        ],
        "bodyweightOnly": false,
        "family": "cyclical",
        "variants": [
            "Freestyle easy",
            "Freestyle interval",
            "Pull buoy swim",
            "Kickboard swim",
            "Open-water tempo"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Air Squat",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "endurance",
            "stamina"
        ],
        "effects": [
            "stamina",
            "volume",
            "skill"
        ],
        "patterns": [
            "squat",
            "knee-dominant"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "squat",
        "variants": [
            "Tempo air squat",
            "Pause air squat",
            "Prisoner squat",
            "Heels-elevated squat",
            "Jumping air squat"
        ],
        "isLoaded": false,
        "description": "Foundational bodyweight squat.",
        "cues": [
            "Heels down",
            "Chest up",
            "Crease below knee"
        ]
    },
    {
        "name": "Pistol Squat",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "balance",
            "strength"
        ],
        "effects": [
            "strength",
            "skill",
            "coordination"
        ],
        "patterns": [
            "single-leg",
            "squat",
            "balance"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "squat",
        "variants": [
            "Box-assisted pistol",
            "Counterweight pistol",
            "Tempo pistol",
            "Alternating pistols",
            "Deficit pistol"
        ],
        "isLoaded": false,
        "description": "Single-leg squat.",
        "cues": [
            "Balance",
            "Heel down"
        ]
    },
    {
        "name": "Walking Lunge",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "stamina",
            "volume",
            "balance"
        ],
        "effects": [
            "stamina",
            "volume",
            "balance"
        ],
        "patterns": [
            "single-leg",
            "knee-dominant"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "single-leg",
        "variants": [
            "Forward lunge",
            "Reverse lunge",
            "Overhead lunge",
            "Lateral lunge",
            "Deficit lunge"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Box Jump",
        "abbreviation": "BJ",
        "modality": "G",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "coordination"
        ],
        "effects": [
            "power",
            "coordination",
            "stamina"
        ],
        "patterns": [
            "plyometric",
            "knee-dominant",
            "power"
        ],
        "equipmentRequired": [
            "box"
        ],
        "bodyweightOnly": false,
        "family": "jump",
        "variants": [
            "Step-down box jump",
            "Rebound box jump",
            "Seated box jump",
            "Lateral box jump",
            "Box jump over"
        ],
        "isLoaded": false,
        "description": "Explosive jump.",
        "cues": [
            "Land soft",
            "Stand tall"
        ]
    },
    {
        "name": "Box Step-Up",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "stamina",
            "recovery",
            "balance"
        ],
        "effects": [
            "stamina",
            "recovery",
            "balance"
        ],
        "patterns": [
            "single-leg",
            "knee-dominant"
        ],
        "equipmentRequired": [
            "box"
        ],
        "bodyweightOnly": false,
        "family": "single-leg",
        "variants": [
            "Alternating step-up",
            "Front rack step-up",
            "Lateral step-up",
            "High box step-up",
            "Tempo step-up"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Burpee",
        "modality": "G",
        "difficulty": "intermediate",
        "stimulusTags": [
            "endurance",
            "stamina"
        ],
        "effects": [
            "engine",
            "mental",
            "stamina"
        ],
        "patterns": [
            "full-body",
            "press",
            "squat"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "full_body",
        "variants": [
            "No-pushup burpee",
            "Strict burpee",
            "Lateral burpee",
            "Bar-facing burpee",
            "Burpee broad jump"
        ],
        "isLoaded": false,
        "description": "Metabolic conditioning.",
        "cues": [
            "Chest to floor",
            "Jump and clap"
        ]
    },
    {
        "name": "Burpee Box Jump Over",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "engine",
            "power",
            "mental"
        ],
        "effects": [
            "engine",
            "power",
            "mental"
        ],
        "patterns": [
            "full-body",
            "plyometric",
            "coordination"
        ],
        "equipmentRequired": [
            "box"
        ],
        "bodyweightOnly": false,
        "family": "full-body",
        "variants": [
            "Step-over version",
            "Jump-over version",
            "Lateral version",
            "No-touch burpee version",
            "Tall box version"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Push-up",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "strength",
            "endurance"
        ],
        "effects": [
            "strength",
            "stamina",
            "volume"
        ],
        "patterns": [
            "horizontal-push",
            "core"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "press",
        "variants": [
            "Incline push-up",
            "Strict push-up",
            "Tempo push-up",
            "Deficit push-up",
            "Hand-release push-up"
        ],
        "isLoaded": false,
        "description": "Horizontal pressing.",
        "cues": [
            "Core tight",
            "Chest to floor",
            "Elbows in"
        ]
    },
    {
        "name": "Ring Push-up",
        "modality": "G",
        "difficulty": "intermediate",
        "stimulusTags": [
            "strength",
            "stability",
            "skill"
        ],
        "effects": [
            "strength",
            "stability",
            "skill"
        ],
        "patterns": [
            "horizontal-push",
            "stability",
            "core"
        ],
        "equipmentRequired": [
            "rings"
        ],
        "bodyweightOnly": false,
        "family": "horizontal-push",
        "variants": [
            "Feet-assisted ring push-up",
            "Strict ring push-up",
            "Tempo ring push-up",
            "Turned-out ring push-up",
            "Archer ring push-up"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Strict Pull-up",
        "modality": "G",
        "difficulty": "intermediate",
        "stimulusTags": [
            "strength",
            "skill",
            "control"
        ],
        "effects": [
            "strength",
            "skill",
            "control"
        ],
        "patterns": [
            "vertical-pull",
            "upper-back",
            "grip"
        ],
        "equipmentRequired": [
            "pullup_bar"
        ],
        "bodyweightOnly": false,
        "family": "vertical-pull",
        "variants": [
            "Band-assisted strict pull-up",
            "Eccentric pull-up",
            "Weighted strict pull-up",
            "Pause strict pull-up",
            "Mixed-grip pull-up"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Kipping Pull-up",
        "modality": "G",
        "difficulty": "intermediate",
        "stimulusTags": [
            "engine",
            "skill",
            "stamina"
        ],
        "effects": [
            "engine",
            "skill",
            "stamina"
        ],
        "patterns": [
            "vertical-pull",
            "hip-drive",
            "coordination"
        ],
        "equipmentRequired": [
            "pullup_bar"
        ],
        "bodyweightOnly": false,
        "family": "vertical-pull",
        "variants": [
            "Kip swing drill",
            "Small-set kipping pull-up",
            "Unbroken kipping pull-up",
            "Butterfly pull-up",
            "Weighted kip practice"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Chest-to-Bar Pull-up",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "power",
            "stamina"
        ],
        "effects": [
            "skill",
            "power",
            "stamina"
        ],
        "patterns": [
            "vertical-pull",
            "hip-drive",
            "grip"
        ],
        "equipmentRequired": [
            "pullup_bar"
        ],
        "bodyweightOnly": false,
        "family": "vertical-pull",
        "variants": [
            "Band-assisted chest-to-bar",
            "Strict chest-to-bar",
            "Kipping chest-to-bar",
            "Butterfly chest-to-bar",
            "Touch-height ladder"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Toes-to-Bar",
        "abbreviation": "T2B",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "stamina"
        ],
        "effects": [
            "skill",
            "stamina",
            "coordination"
        ],
        "patterns": [
            "core",
            "hip-flexion",
            "grip"
        ],
        "equipmentRequired": [
            "pullup_bar"
        ],
        "bodyweightOnly": false,
        "family": "core",
        "variants": [
            "Hanging knee raise",
            "Toe-to-target",
            "Strict toes-to-bar",
            "Kipping toes-to-bar",
            "L-swing to toes-to-bar"
        ],
        "isLoaded": false,
        "description": "Hanging abdominal work.",
        "cues": [
            "Big kip",
            "Toes touch bar"
        ]
    },
    {
        "name": "Knee Raise",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "skill",
            "stamina",
            "control"
        ],
        "effects": [
            "skill",
            "stamina",
            "control"
        ],
        "patterns": [
            "core",
            "hip-flexion",
            "grip"
        ],
        "equipmentRequired": [
            "pullup_bar"
        ],
        "bodyweightOnly": false,
        "family": "core",
        "variants": [
            "Captain's chair knee raise",
            "Hanging knee raise",
            "Tempo knee raise",
            "Alternating knee raise",
            "Weighted knee raise"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Sit-up",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "endurance"
        ],
        "effects": [
            "stamina",
            "volume",
            "recovery"
        ],
        "patterns": [
            "core",
            "trunk-flexion"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "core",
        "variants": [
            "Ab-mat sit-up",
            "Anchor sit-up",
            "Tempo sit-up",
            "Butterfly sit-up",
            "Weighted sit-up"
        ],
        "isLoaded": false,
        "description": "AbMat sit-up.",
        "cues": [
            "Touch floor behind head",
            "Touch toes"
        ]
    },
    {
        "name": "GHD Sit-up",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "strength",
            "stamina",
            "skill"
        ],
        "effects": [
            "strength",
            "stamina",
            "skill"
        ],
        "patterns": [
            "core",
            "trunk-flexion",
            "hip-extension"
        ],
        "equipmentRequired": [
            "ghd"
        ],
        "bodyweightOnly": false,
        "family": "core",
        "variants": [
            "Partial ROM GHD sit-up",
            "Strict GHD sit-up",
            "Weighted GHD sit-up",
            "Tempo GHD sit-up",
            "GHD hip-extension combo"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Hollow Rock",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "skill",
            "stability",
            "recovery"
        ],
        "effects": [
            "skill",
            "stability",
            "recovery"
        ],
        "patterns": [
            "core",
            "midline-stability"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "core",
        "variants": [
            "Tuck hollow hold",
            "Hollow hold",
            "Hollow rock",
            "Weighted hollow hold",
            "Arch-hollow roll"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "V-up",
        "modality": "G",
        "difficulty": "intermediate",
        "stimulusTags": [
            "stamina",
            "skill",
            "volume"
        ],
        "effects": [
            "stamina",
            "skill",
            "volume"
        ],
        "patterns": [
            "core",
            "trunk-flexion",
            "hip-flexion"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "core",
        "variants": [
            "Single-leg V-up",
            "Alternating V-up",
            "Tempo V-up",
            "Weighted V-up",
            "Hollow-to-V-up"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Dead Bug",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "recovery",
            "stability",
            "skill"
        ],
        "effects": [
            "recovery",
            "stability",
            "skill"
        ],
        "patterns": [
            "core",
            "midline-stability",
            "coordination"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "core",
        "variants": [
            "Bent-knee dead bug",
            "Straight-leg dead bug",
            "Banded dead bug",
            "Tempo dead bug",
            "Opposite-side dead bug"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Plank",
        "modality": "G",
        "difficulty": "beginner",
        "stimulusTags": [
            "stability",
            "recovery",
            "skill"
        ],
        "effects": [
            "stability",
            "recovery",
            "skill"
        ],
        "patterns": [
            "core",
            "anti-extension",
            "stability"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "core",
        "variants": [
            "Forearm plank",
            "High plank",
            "RKC plank",
            "Side plank",
            "Plank shoulder tap"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Rope Climb",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "strength",
            "mental"
        ],
        "effects": [
            "skill",
            "strength",
            "mental"
        ],
        "patterns": [
            "vertical-pull",
            "grip",
            "hip-knee-coordination"
        ],
        "equipmentRequired": [
            "rope"
        ],
        "bodyweightOnly": false,
        "family": "vertical-pull",
        "variants": [
            "Seated rope pull",
            "J-hook rope climb",
            "S-hook rope climb",
            "Legless rope climb",
            "Controlled descent rope climb"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Wall Walk",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "strength",
            "mental"
        ],
        "effects": [
            "skill",
            "strength",
            "mental"
        ],
        "patterns": [
            "overhead",
            "core",
            "horizontal-push"
        ],
        "equipmentRequired": [
            "wall"
        ],
        "bodyweightOnly": false,
        "family": "overhead",
        "variants": [
            "Partial wall walk",
            "Strict wall walk",
            "Shoulder tap wall hold",
            "Handstand facing wall hold",
            "Wall walk with pause"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Handstand Push-up",
        "abbreviation": "HSPU",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "strength"
        ],
        "effects": [
            "strength",
            "skill",
            "control"
        ],
        "patterns": [
            "vertical-push",
            "overhead",
            "core"
        ],
        "equipmentRequired": [
            "wall"
        ],
        "bodyweightOnly": false,
        "family": "press",
        "variants": [
            "Pike push-up",
            "Ab-mat handstand push-up",
            "Strict handstand push-up",
            "Kipping handstand push-up",
            "Deficit handstand push-up"
        ],
        "isLoaded": false,
        "description": "Inverted pressing.",
        "cues": [
            "Head forward",
            "Big kick"
        ]
    },
    {
        "name": "Handstand Walk",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "coordination",
            "mental"
        ],
        "effects": [
            "skill",
            "coordination",
            "mental"
        ],
        "patterns": [
            "overhead",
            "balance",
            "core"
        ],
        "equipmentRequired": [],
        "bodyweightOnly": true,
        "family": "overhead",
        "variants": [
            "Wall-supported handstand march",
            "Freestanding hold",
            "Short handstand walks",
            "Obstacle handstand walk",
            "Turn handstand walk"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Ring Dip",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "strength",
            "stamina"
        ],
        "effects": [
            "strength",
            "skill",
            "control"
        ],
        "patterns": [
            "vertical-push",
            "stability",
            "upper-body"
        ],
        "equipmentRequired": [
            "rings"
        ],
        "bodyweightOnly": false,
        "family": "press",
        "variants": [
            "Feet-assisted ring dip",
            "Band-assisted ring dip",
            "Strict ring dip",
            "Pause ring dip",
            "Weighted ring dip"
        ],
        "isLoaded": false,
        "description": "Unstable pressing.",
        "cues": [
            "Rings close",
            "Full lockout"
        ]
    },
    {
        "name": "Bar Muscle-up",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "power",
            "coordination"
        ],
        "effects": [
            "skill",
            "power",
            "coordination"
        ],
        "patterns": [
            "vertical-pull",
            "dip",
            "hip-drive"
        ],
        "equipmentRequired": [
            "pullup_bar"
        ],
        "bodyweightOnly": false,
        "family": "vertical-pull",
        "variants": [
            "Chest-to-bar transition drill",
            "Banded bar muscle-up",
            "Strict bar muscle-up",
            "Kipping bar muscle-up",
            "Turnover timing drill"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Ring Muscle-up",
        "abbreviation": "MU",
        "modality": "G",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "power",
            "strength"
        ],
        "effects": [
            "skill",
            "strength",
            "coordination"
        ],
        "patterns": [
            "vertical-pull",
            "dip",
            "stability"
        ],
        "equipmentRequired": [
            "rings"
        ],
        "bodyweightOnly": false,
        "family": "pull",
        "variants": [
            "Low-ring transition drill",
            "Banded ring muscle-up",
            "Strict ring muscle-up",
            "Kipping ring muscle-up",
            "False-grip ring muscle-up"
        ],
        "isLoaded": false,
        "description": "Advanced gymnastics on rings.",
        "cues": [
            "Fast turnover",
            "Lock out dip"
        ]
    },
    {
        "name": "Deadlift",
        "abbreviation": "DL",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "strength",
            "power"
        ],
        "effects": [
            "strength",
            "power",
            "skill"
        ],
        "patterns": [
            "hinge",
            "posterior-chain",
            "grip"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Tempo deadlift",
            "Pause deadlift",
            "Deficit deadlift",
            "Touch-and-go deadlift",
            "Heavy singles deadlift"
        ],
        "isLoaded": true,
        "description": "Foundational hinge.",
        "cues": [
            "Flat back",
            "Heels down"
        ],
        "defaultLoadKg": {
            "beginner": 20,
            "scaled": 40,
            "rx": 100
        }
    },
    {
        "name": "Romanian Deadlift",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "strength",
            "control",
            "hypertrophy"
        ],
        "effects": [
            "strength",
            "control",
            "hypertrophy"
        ],
        "patterns": [
            "hinge",
            "hamstring",
            "posterior-chain"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Dumbbell RDL",
            "Single-leg RDL",
            "Tempo RDL",
            "Snatch-grip RDL",
            "Deficit RDL"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Sumo Deadlift High Pull",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "stamina"
        ],
        "effects": [
            "power",
            "engine",
            "coordination"
        ],
        "patterns": [
            "hinge",
            "vertical-pull",
            "hip-drive"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "pull",
        "variants": [
            "Light SDHP",
            "Hang SDHP",
            "Wide-stance SDHP",
            "Tempo SDHP",
            "Cluster SDHP"
        ],
        "isLoaded": true,
        "description": "Sumo Deadlift High Pull.",
        "cues": [
            "High elbows"
        ],
        "defaultLoadKg": {
            "beginner": 15,
            "scaled": 30,
            "rx": 43
        }
    },
    {
        "name": "Front Squat",
        "abbreviation": "FS",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "strength"
        ],
        "effects": [
            "strength",
            "power",
            "position"
        ],
        "patterns": [
            "squat",
            "knee-dominant",
            "core"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "squat",
        "variants": [
            "Tempo front squat",
            "Pause front squat",
            "Cluster front squat",
            "Clean-grip front squat",
            "Cross-arm front squat"
        ],
        "isLoaded": true,
        "description": "Anterior load strength.",
        "cues": [
            "Elbows high"
        ],
        "defaultLoadKg": {
            "beginner": 15,
            "scaled": 30,
            "rx": 60
        }
    },
    {
        "name": "Back Squat",
        "abbreviation": "BS",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "strength"
        ],
        "effects": [
            "strength",
            "power",
            "volume"
        ],
        "patterns": [
            "squat",
            "knee-dominant",
            "hip-drive"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "squat",
        "variants": [
            "Tempo back squat",
            "Pause back squat",
            "Box back squat",
            "Safety-bar squat",
            "Wave loading back squat"
        ],
        "isLoaded": true,
        "description": "Posterior chain strength.",
        "cues": [
            "Big breath",
            "Drive up"
        ],
        "defaultLoadKg": {
            "beginner": 20,
            "scaled": 40,
            "rx": 80
        }
    },
    {
        "name": "Overhead Squat",
        "abbreviation": "OHS",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "skill",
            "flexibility",
            "strength"
        ],
        "effects": [
            "skill",
            "strength",
            "mobility"
        ],
        "patterns": [
            "squat",
            "overhead",
            "stability"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "squat",
        "variants": [
            "PVC overhead squat",
            "Snatch-grip overhead squat",
            "Tempo overhead squat",
            "Pause overhead squat",
            "Heels-elevated overhead squat"
        ],
        "isLoaded": true,
        "description": "Core and shoulder stability.",
        "cues": [
            "Armpits forward"
        ],
        "defaultLoadKg": {
            "beginner": 0,
            "scaled": 20,
            "rx": 43
        }
    },
    {
        "name": "Strict Press",
        "abbreviation": "SP",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "strength"
        ],
        "effects": [
            "strength",
            "control",
            "skill"
        ],
        "patterns": [
            "vertical-push",
            "overhead",
            "core"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "press",
        "variants": [
            "Seated strict press",
            "Tempo strict press",
            "Pin strict press",
            "Behind-the-neck press",
            "Dumbbell strict press"
        ],
        "isLoaded": true,
        "description": "Strict overhead pressing.",
        "cues": [
            "Core locked"
        ],
        "defaultLoadKg": {
            "beginner": 10,
            "scaled": 20,
            "rx": 40
        }
    },
    {
        "name": "Push Press",
        "abbreviation": "PP",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "strength"
        ],
        "effects": [
            "power",
            "strength",
            "stamina"
        ],
        "patterns": [
            "vertical-push",
            "overhead",
            "hip-drive"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "press",
        "variants": [
            "Tempo dip push press",
            "Behind-neck push press",
            "Split-stance push press",
            "Double dumbbell push press",
            "Cluster push press"
        ],
        "isLoaded": true,
        "description": "Dip and drive pressing.",
        "cues": [
            "Heels down on dip"
        ],
        "defaultLoadKg": {
            "beginner": 15,
            "scaled": 30,
            "rx": 50
        }
    },
    {
        "name": "Push Jerk",
        "abbreviation": "PJ",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "skill"
        ],
        "effects": [
            "power",
            "skill",
            "coordination"
        ],
        "patterns": [
            "vertical-push",
            "overhead",
            "power"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "press",
        "variants": [
            "Dip-drive jerk drill",
            "Power jerk from rack",
            "Tempo catch jerk",
            "Split jerk to push jerk combo",
            "Double dip jerk drill"
        ],
        "isLoaded": true,
        "description": "Dynamic overhead movement.",
        "cues": [
            "Fast drop"
        ],
        "defaultLoadKg": {
            "beginner": 15,
            "scaled": 40,
            "rx": 60
        }
    },
    {
        "name": "Split Jerk",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "skill",
            "coordination"
        ],
        "effects": [
            "power",
            "skill",
            "coordination"
        ],
        "patterns": [
            "vertical-push",
            "overhead",
            "split-stance"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "vertical-push",
        "variants": [
            "Footwork split drill",
            "Jerk dip squat",
            "Jerk from blocks",
            "Tall split jerk",
            "Pause split jerk recover"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Shoulder to Overhead",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "strength",
            "power",
            "engine"
        ],
        "effects": [
            "strength",
            "power",
            "engine"
        ],
        "patterns": [
            "vertical-push",
            "overhead"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "vertical-push",
        "variants": [
            "Strict press reps",
            "Push press reps",
            "Push jerk reps",
            "Split jerk reps",
            "Alternating barbell cycling"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Power Clean",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "skill",
            "strength"
        ],
        "effects": [
            "power",
            "skill",
            "coordination"
        ],
        "patterns": [
            "hinge",
            "front-rack",
            "pull"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "pull",
        "variants": [
            "Hang power clean",
            "Block power clean",
            "Tempo pull + clean",
            "Touch-and-go power clean",
            "Pause above-knee power clean"
        ],
        "isLoaded": true,
        "description": "Olympic pulling.",
        "cues": [
            "Jump and shrug"
        ],
        "defaultLoadKg": {
            "beginner": 20,
            "scaled": 40,
            "rx": 60
        }
    },
    {
        "name": "Squat Clean",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "strength",
            "skill"
        ],
        "effects": [
            "power",
            "strength",
            "skill"
        ],
        "patterns": [
            "hinge",
            "squat",
            "front-rack"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Hang squat clean",
            "Pause squat clean",
            "Block squat clean",
            "Clean pull + squat clean",
            "Cluster squat clean"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Hang Power Clean",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "coordination",
            "speed"
        ],
        "effects": [
            "power",
            "coordination",
            "speed"
        ],
        "patterns": [
            "hinge",
            "front-rack",
            "pull"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "High-hang power clean",
            "Below-knee hang clean",
            "Pause hang clean",
            "No-foot hang clean",
            "Muscle clean"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Clean and Jerk",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "strength",
            "skill"
        ],
        "effects": [
            "power",
            "strength",
            "skill"
        ],
        "patterns": [
            "hinge",
            "front-rack",
            "overhead"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Power clean + push jerk",
            "Squat clean + split jerk",
            "Clean complex",
            "Jerk complex",
            "EMOM clean and jerk"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Power Snatch",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "skill",
            "flexibility"
        ],
        "effects": [
            "power",
            "skill",
            "coordination"
        ],
        "patterns": [
            "hinge",
            "overhead",
            "pull"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "pull",
        "variants": [
            "Hang power snatch",
            "Block power snatch",
            "Pause snatch pull + power snatch",
            "No-hook power snatch",
            "Touch-and-go power snatch"
        ],
        "isLoaded": true,
        "description": "Dynamic full-body power.",
        "cues": [
            "Fast elbows"
        ],
        "defaultLoadKg": {
            "beginner": 10,
            "scaled": 30,
            "rx": 43
        }
    },
    {
        "name": "Squat Snatch",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "skill",
            "mobility"
        ],
        "effects": [
            "power",
            "skill",
            "mobility"
        ],
        "patterns": [
            "hinge",
            "overhead",
            "squat"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Hang squat snatch",
            "Pause squat snatch",
            "Snatch balance + squat snatch",
            "Block squat snatch",
            "Cluster squat snatch"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Hang Snatch",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "skill",
            "speed"
        ],
        "effects": [
            "power",
            "skill",
            "speed"
        ],
        "patterns": [
            "hinge",
            "overhead",
            "pull"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "High-hang snatch",
            "Below-knee hang snatch",
            "No-foot hang snatch",
            "Hang power snatch",
            "Hang squat snatch"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Thruster",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "stamina"
        ],
        "effects": [
            "engine",
            "power",
            "stamina"
        ],
        "patterns": [
            "squat",
            "overhead",
            "full-body"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "squat",
        "variants": [
            "Light cycling thruster",
            "Heavy thruster",
            "Double dumbbell thruster",
            "Single-arm dumbbell thruster",
            "Pause thruster"
        ],
        "isLoaded": true,
        "description": "Squat into press.",
        "cues": [
            "One fluid motion"
        ],
        "defaultLoadKg": {
            "beginner": 10,
            "scaled": 30,
            "rx": 43
        }
    },
    {
        "name": "Clean Pull",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "strength",
            "position"
        ],
        "effects": [
            "power",
            "strength",
            "position"
        ],
        "patterns": [
            "hinge",
            "posterior-chain",
            "pull"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Segment clean pull",
            "Pause clean pull",
            "Deficit clean pull",
            "Snatch-grip clean pull",
            "Heavy clean pull"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Snatch Pull",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "strength",
            "position"
        ],
        "effects": [
            "power",
            "strength",
            "position"
        ],
        "patterns": [
            "hinge",
            "posterior-chain",
            "pull"
        ],
        "equipmentRequired": [
            "barbell"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Segment snatch pull",
            "Pause snatch pull",
            "Deficit snatch pull",
            "High-pull snatch pull",
            "Heavy snatch pull"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Dumbbell Snatch",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "power",
            "stamina"
        ],
        "effects": [
            "power",
            "engine",
            "coordination"
        ],
        "patterns": [
            "hinge",
            "overhead",
            "single-arm"
        ],
        "equipmentRequired": [
            "dumbbells"
        ],
        "bodyweightOnly": false,
        "family": "pull",
        "variants": [
            "Alternating dumbbell snatch",
            "Hang dumbbell snatch",
            "Cycling dumbbell snatch",
            "Heavy single dumbbell snatch",
            "Power dumbbell snatch"
        ],
        "isLoaded": true,
        "description": "Single-arm power.",
        "cues": [
            "Punch up"
        ]
    },
    {
        "name": "Dumbbell Clean and Jerk",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "skill",
            "engine"
        ],
        "effects": [
            "power",
            "skill",
            "engine"
        ],
        "patterns": [
            "hinge",
            "front-rack",
            "overhead"
        ],
        "equipmentRequired": [
            "dumbbells"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Alternating dumbbell clean and jerk",
            "Single-arm dumbbell clean and jerk",
            "Double dumbbell clean and jerk",
            "Hang dumbbell clean and jerk",
            "Split dumbbell jerk"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Dumbbell Thruster",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "engine",
            "stamina",
            "power"
        ],
        "effects": [
            "engine",
            "stamina",
            "power"
        ],
        "patterns": [
            "squat",
            "overhead",
            "full-body"
        ],
        "equipmentRequired": [
            "dumbbells"
        ],
        "bodyweightOnly": false,
        "family": "squat",
        "variants": [
            "Single dumbbell thruster",
            "Double dumbbell thruster",
            "Alternating thruster",
            "Pause thruster",
            "Tempo thruster"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Dumbbell Front Rack Lunge",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "strength",
            "stamina",
            "balance"
        ],
        "effects": [
            "strength",
            "stamina",
            "balance"
        ],
        "patterns": [
            "single-leg",
            "front-rack",
            "knee-dominant"
        ],
        "equipmentRequired": [
            "dumbbells"
        ],
        "bodyweightOnly": false,
        "family": "single-leg",
        "variants": [
            "Walking front rack lunge",
            "Reverse front rack lunge",
            "Alternating step lunge",
            "Deficit lunge",
            "Double dumbbell lunge"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Kettlebell Swing",
        "abbreviation": "KBS",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "power",
            "endurance"
        ],
        "effects": [
            "power",
            "engine",
            "stamina"
        ],
        "patterns": [
            "hinge",
            "posterior-chain",
            "ballistic"
        ],
        "equipmentRequired": [
            "kettlebells"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Russian kettlebell swing",
            "American kettlebell swing",
            "Single-arm kettlebell swing",
            "Tempo kettlebell swing",
            "Heavy kettlebell swing"
        ],
        "isLoaded": true,
        "description": "Ballistic hinge.",
        "cues": [
            "Snap hips"
        ],
        "defaultLoadKg": {
            "beginner": 8,
            "scaled": 16,
            "rx": 24
        }
    },
    {
        "name": "Kettlebell Clean",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "skill",
            "coordination"
        ],
        "effects": [
            "power",
            "skill",
            "coordination"
        ],
        "patterns": [
            "hinge",
            "front-rack",
            "single-arm"
        ],
        "equipmentRequired": [
            "kettlebells"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Single kettlebell clean",
            "Double kettlebell clean",
            "Hang kettlebell clean",
            "Alternating kettlebell clean",
            "Kettlebell clean ladder"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Kettlebell Snatch",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "skill",
            "engine"
        ],
        "effects": [
            "power",
            "skill",
            "engine"
        ],
        "patterns": [
            "hinge",
            "overhead",
            "single-arm"
        ],
        "equipmentRequired": [
            "kettlebells"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Single kettlebell snatch",
            "Alternating kettlebell snatch",
            "Hang kettlebell snatch",
            "Drop-and-catch kettlebell snatch",
            "Kettlebell snatch interval"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Turkish Get-Up",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "stability",
            "skill",
            "control"
        ],
        "effects": [
            "stability",
            "skill",
            "control"
        ],
        "patterns": [
            "overhead",
            "core",
            "shoulder-stability"
        ],
        "equipmentRequired": [
            "kettlebells"
        ],
        "bodyweightOnly": false,
        "family": "overhead",
        "variants": [
            "Bodyweight get-up",
            "Half get-up",
            "Full kettlebell get-up",
            "Bottom-up get-up",
            "Tempo get-up"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Wall Ball Shot",
        "abbreviation": "WB",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "endurance",
            "stamina"
        ],
        "effects": [
            "engine",
            "stamina",
            "volume"
        ],
        "patterns": [
            "squat",
            "vertical-push",
            "coordination"
        ],
        "equipmentRequired": [
            "wall_ball",
            "wall"
        ],
        "bodyweightOnly": false,
        "family": "squat",
        "variants": [
            "Light wall ball",
            "Heavy wall ball",
            "Low target wall ball",
            "Lateral wall ball",
            "Partner wall ball"
        ],
        "isLoaded": true,
        "description": "Squat and throw.",
        "cues": [
            "Target hit"
        ]
    },
    {
        "name": "Med Ball Clean",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "power",
            "engine",
            "coordination"
        ],
        "effects": [
            "power",
            "engine",
            "coordination"
        ],
        "patterns": [
            "hinge",
            "front-load",
            "squat"
        ],
        "equipmentRequired": [
            "med_ball"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Ground to shoulder med-ball clean",
            "Cycling med-ball clean",
            "No-jump med-ball clean",
            "Partner med-ball clean",
            "Heavy med-ball clean"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Sandbag Clean",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "strength",
            "power",
            "mental"
        ],
        "effects": [
            "strength",
            "power",
            "mental"
        ],
        "patterns": [
            "hinge",
            "front-load",
            "full-body"
        ],
        "equipmentRequired": [
            "sandbag"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Ground to shoulder sandbag clean",
            "Ground to lap to shoulder",
            "Cycling sandbag clean",
            "Heavy singles sandbag clean",
            "Sandbag clean to carry"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Sandbag Front Carry",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "stamina",
            "strength",
            "mental"
        ],
        "effects": [
            "stamina",
            "strength",
            "mental"
        ],
        "patterns": [
            "carry",
            "core",
            "front-load"
        ],
        "equipmentRequired": [
            "sandbag"
        ],
        "bodyweightOnly": false,
        "family": "carry",
        "variants": [
            "Short shuttle carry",
            "Long carry",
            "Uphill carry",
            "Bear-hug carry",
            "Carry with step-over"
        ],
        "isLoaded": true,
        "description": "Front-loaded carry for total-body stamina.",
        "cues": ["Brace core", "Control the load"]
    },
    {
        "name": "Farmer Carry",
        "modality": "W",
        "difficulty": "beginner",
        "stimulusTags": [
            "stamina",
            "strength",
            "stability"
        ],
        "effects": [
            "stamina",
            "strength",
            "stability"
        ],
        "patterns": [
            "carry",
            "grip",
            "core"
        ],
        "equipmentRequired": [
            "dumbbells"
        ],
        "bodyweightOnly": false,
        "family": "carry",
        "variants": [
            "Double dumbbell carry",
            "Single-arm suitcase carry",
            "Heavy farmer hold",
            "Walking farmer carry",
            "Farmer carry intervals"
        ],
        "isLoaded": true,
        "description": "Bilateral grip carry.",
        "cues": [
            "Shoulders back",
            "Eyes forward"
        ],
        "defaultLoadKg": {
            "beginner": 12,
            "scaled": 20,
            "rx": 24
        }
    },
    {
        "name": "Sled Push",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "power",
            "engine",
            "mental"
        ],
        "effects": [
            "power",
            "engine",
            "mental"
        ],
        "patterns": [
            "knee-dominant",
            "drive",
            "full-body"
        ],
        "equipmentRequired": [
            "sled"
        ],
        "bodyweightOnly": false,
        "family": "knee-dominant",
        "variants": [
            "Light fast sled push",
            "Heavy sled push",
            "Backward sled push",
            "Sprint sled push",
            "Sled push with turns"
        ],
        "isLoaded": true,
        "description": "Lower-body drive against a loaded sled.",
        "cues": ["Drive through the floor"]
    },
    {
        "name": "Sled Pull",
        "modality": "W",
        "difficulty": "intermediate",
        "stimulusTags": [
            "strength",
            "engine",
            "stamina"
        ],
        "effects": [
            "strength",
            "engine",
            "stamina"
        ],
        "patterns": [
            "pull",
            "posterior-chain",
            "grip"
        ],
        "equipmentRequired": [
            "sled"
        ],
        "bodyweightOnly": false,
        "family": "pull",
        "variants": [
            "Forward sled drag",
            "Backward sled drag",
            "Hand-over-hand pull",
            "Heavy sled pull",
            "Sled pull intervals"
        ],
        "isLoaded": true,
        "description": "Rope or strap drag against sled resistance.",
        "cues": ["Step and pull"]
    },
    {
        "name": "Yoke Carry",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "strength",
            "stability",
            "mental"
        ],
        "effects": [
            "strength",
            "stability",
            "mental"
        ],
        "patterns": [
            "carry",
            "core",
            "axial-load"
        ],
        "equipmentRequired": [
            "yoke"
        ],
        "bodyweightOnly": false,
        "family": "carry",
        "variants": [
            "Light yoke walk",
            "Heavy yoke walk",
            "Yoke walk with turn",
            "Yoke shuttle",
            "Yoke carry intervals"
        ],
        "isLoaded": true,
        "description": "Axially loaded carry for total-body stability.",
        "cues": ["Brace hard", "Quick steps"]
    },
    {
        "name": "Tire Flip",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "power",
            "strength",
            "mental"
        ],
        "effects": [
            "power",
            "strength",
            "mental"
        ],
        "patterns": [
            "hinge",
            "triple-extension",
            "full-body"
        ],
        "equipmentRequired": [
            "tire"
        ],
        "bodyweightOnly": false,
        "family": "hinge",
        "variants": [
            "Low-height tire flip",
            "Heavy tire single flips",
            "Tire flip sprint",
            "Partner tire flip",
            "Flip-and-jump-over"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Devil Press",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "engine",
            "power",
            "mental"
        ],
        "effects": [
            "engine",
            "power",
            "mental"
        ],
        "patterns": [
            "full-body",
            "hinge",
            "overhead"
        ],
        "equipmentRequired": [
            "dumbbells"
        ],
        "bodyweightOnly": false,
        "family": "full-body",
        "variants": [
            "Alternating devil press",
            "Double dumbbell devil press",
            "No-pushup devil press",
            "Heavy devil press",
            "Tempo devil press"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    },
    {
        "name": "Man Maker",
        "modality": "W",
        "difficulty": "advanced",
        "stimulusTags": [
            "engine",
            "strength",
            "skill"
        ],
        "effects": [
            "engine",
            "strength",
            "skill"
        ],
        "patterns": [
            "full-body",
            "push",
            "hinge",
            "squat"
        ],
        "equipmentRequired": [
            "dumbbells"
        ],
        "bodyweightOnly": false,
        "family": "full-body",
        "variants": [
            "Half man maker",
            "Alternating man maker",
            "Single dumbbell man maker",
            "Double dumbbell man maker",
            "Cluster man maker"
        ],
        "isLoaded": false,
        "description": "",
        "cues": []
    }
];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing test data
    await Movement.deleteMany({});
    console.log("Cleared existing movements");

    // Insert test movements
    const result = await Movement.insertMany(testMovements);
    console.log(`Seeded ${result.length} movements`);

    await mongoose.disconnect();
    console.log("Done!");
}

seed().catch(console.error);
