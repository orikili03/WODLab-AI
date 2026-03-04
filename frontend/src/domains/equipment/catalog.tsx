import {
    Dumbbell,
    Bike,
    Circle,
    Package,
    Minus,
    BarChart3,
    Waves,
    Frame,
    Wind,
    Square,
    Activity,
    Archive,
    FastForward,
    Disc,
    Target,
    type LucideIcon,
} from "lucide-react";

export type EquipmentCategory = "Gymnastics" | "Strength" | "Conditioning" | "Optional";

export interface EquipmentCatalogItem {
    id: string;
    label: string;
    category: EquipmentCategory;
    Icon: LucideIcon;
    weightDependent?: boolean;
}

export const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
    // --- Gymnastics ---
    { id: "pullup_bar", label: "Pull-up bar", category: "Gymnastics", Icon: BarChart3 },
    { id: "rings", label: "Rings", category: "Gymnastics", Icon: Circle },
    { id: "box", label: "Box", category: "Gymnastics", Icon: Package },
    { id: "wall", label: "Wall", category: "Gymnastics", Icon: Square },
    { id: "rope", label: "Climbing Rope", category: "Gymnastics", Icon: Minus },
    { id: "ghd", label: "GHD", category: "Gymnastics", Icon: Activity },

    // --- Strength ---
    { id: "rack", label: "Squat Rack / Rig", category: "Strength", Icon: Frame },
    { id: "barbell", label: "Barbell", category: "Strength", Icon: Dumbbell, weightDependent: true },
    { id: "kettlebells", label: "Kettlebells", category: "Strength", Icon: Dumbbell, weightDependent: true },
    { id: "dumbbells", label: "Dumbbells", category: "Strength", Icon: Dumbbell, weightDependent: true },
    { id: "wall_ball", label: "Wall Ball", category: "Strength", Icon: Target },
    { id: "med_ball", label: "Medicine Ball", category: "Strength", Icon: Disc },

    // --- Conditioning ---
    { id: "rower", label: "Rower", category: "Conditioning", Icon: Waves },
    { id: "bike_erg", label: "Bike Erg", category: "Conditioning", Icon: Bike },
    { id: "assault_bike", label: "Assault bike", category: "Conditioning", Icon: Bike },
    { id: "ski_erg", label: "Ski Erg", category: "Conditioning", Icon: Wind },
    { id: "jump_rope", label: "Jump rope", category: "Conditioning", Icon: Minus },

    // --- Optional / Specialty ---
    { id: "sandbag", label: "Sandbag", category: "Optional", Icon: Archive },
    { id: "sled", label: "Sled", category: "Optional", Icon: FastForward },
    { id: "yoke", label: "Yoke", category: "Optional", Icon: Frame },
    { id: "tire", label: "Tire", category: "Optional", Icon: Disc },
    { id: "pool", label: "Pool / Swim", category: "Optional", Icon: Waves },
];

export interface BuiltinPreset {
    id: string;
    name: string;
    description: string;
    selected: Array<{ id: string; minWeight?: number; maxWeight?: number }>;
}

export const BUILTIN_PRESETS: BuiltinPreset[] = [
    { id: "none", name: "No equipment", description: "Bodyweight only", selected: [] },
    {
        id: "travel",
        name: "Travel",
        description: "Minimal equipment",
        selected: [{ id: "pullup_bar" }, { id: "jump_rope" }],
    },
    {
        id: "home",
        name: "Home / Garage",
        description: "Barbell + basics",
        selected: [
            { id: "rack" },
            { id: "barbell" },
            { id: "pullup_bar" },
            { id: "kettlebells" },
            { id: "dumbbells" },
            { id: "jump_rope" },
        ],
    },
    {
        id: "full",
        name: "Full box",
        description: "Full gym access",
        selected: EQUIPMENT_CATALOG.map((e) => ({ id: e.id })),
    },
    { id: "custom", name: "Custom", description: "Create your own preset", selected: [] },
];
