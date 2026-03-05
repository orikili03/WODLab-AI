import type { WodProtocol } from "../WodAssemblyService.js";

// ─── Blueprint Types ──────────────────────────────────────────────────────

export type StimulusTarget = "sprint" | "short_metcon" | "aerobic" | "strength" | "skill";
export type TierKey = "beginner" | "intermediate" | "rx";

export interface ProtocolBlueprint {
    /** Working duration range in minutes [min, max] */
    durationRange: [number, number];
    /** Movement count range [min, max] */
    movementCount: [number, number];
    /** Explicit round count (FOR_TIME, 21-15-9) — undefined means protocol-default */
    rounds?: number;
    /** Rep multiplier vs. baseline modality reps (1.0 = no change) */
    repMultiplier: number;
    /** Fraction of movement's defaultLoadKg to prescribe (0.0–1.0) */
    loadFraction: number;
    /** EMOM: target work window per minute in seconds */
    emomWindowSec?: number;
    /** INTERVAL: per-round work time in seconds */
    intervalWorkSec?: number;
    /** INTERVAL: per-round rest time in seconds */
    intervalRestSec?: number;
    /** If true, force a single monostructural movement (classic tabata sprint) */
    forceMonostructural?: boolean;
}

// ─── Tier Adjustment Multipliers ──────────────────────────────────────────

interface TierMultipliers {
    duration: number;
    reps: number;
    load: number;
}

const TIER_ADJUSTMENTS: Record<TierKey, TierMultipliers> = {
    beginner: { duration: 0.80, reps: 0.70, load: 0.65 },
    intermediate: { duration: 0.90, reps: 0.85, load: 0.80 },
    rx: { duration: 1.00, reps: 1.00, load: 1.00 },
};

// ─── Base Blueprint Matrix ────────────────────────────────────────────────
//
// Coaching doctrine from stimulus-library.md and coaching-principles.md.
// Each entry encodes what an experienced coach carries in their head about
// how a specific protocol should be configured for a specific stimulus.
//
// The key format is "PROTOCOL::STIMULUS" — lookups fall back to the
// protocol's most natural stimulus when no exact match exists.

type MatrixKey = `${WodProtocol}::${StimulusTarget}`;

const BASE_BLUEPRINTS: Partial<Record<MatrixKey, ProtocolBlueprint>> = {

    // ── FOR_TIME ──────────────────────────────────────────────────────────
    "FOR_TIME::sprint": {
        durationRange: [5, 7],
        movementCount: [2, 2],
        rounds: 1,
        repMultiplier: 0.70,
        loadFraction: 0.65,
    },
    "FOR_TIME::short_metcon": {
        durationRange: [10, 18],
        movementCount: [2, 3],
        rounds: 3,
        repMultiplier: 1.00,
        loadFraction: 0.60,
    },
    "FOR_TIME::aerobic": {
        durationRange: [25, 40],
        movementCount: [3, 4],
        rounds: 5,
        repMultiplier: 1.40,
        loadFraction: 0.45,
    },

    // ── AMRAP ─────────────────────────────────────────────────────────────
    "AMRAP::sprint": {
        durationRange: [5, 8],
        movementCount: [2, 2],
        repMultiplier: 0.60,
        loadFraction: 0.65,
    },
    "AMRAP::short_metcon": {
        durationRange: [10, 18],
        movementCount: [2, 3],
        repMultiplier: 1.00,
        loadFraction: 0.60,
    },
    "AMRAP::aerobic": {
        durationRange: [20, 35],
        movementCount: [3, 4],
        repMultiplier: 1.20,
        loadFraction: 0.45,
    },

    // ── EMOM ──────────────────────────────────────────────────────────────
    "EMOM::short_metcon": {
        durationRange: [10, 20],
        movementCount: [2, 3],
        repMultiplier: 0.50,
        loadFraction: 0.55,
        emomWindowSec: 40,           // 60-70% of the minute working
    },
    "EMOM::strength": {
        durationRange: [12, 20],
        movementCount: [1, 2],
        repMultiplier: 0.30,
        loadFraction: 0.85,
        emomWindowSec: 25,           // full rest within the minute
    },
    "EMOM::sprint": {
        durationRange: [8, 12],
        movementCount: [2, 3],
        repMultiplier: 0.45,
        loadFraction: 0.60,
        emomWindowSec: 45,           // 90%+ density for sprint EMOM
    },

    // ── 21-15-9 ───────────────────────────────────────────────────────────
    "21_15_9::sprint": {
        durationRange: [5, 8],
        movementCount: [2, 3],
        rounds: 3,                   // implicit in the structure: 21, 15, 9
        repMultiplier: 0.70,
        loadFraction: 0.65,
    },

    // ── TABATA ─────────────────────────────────────────────────────────────
    // Classic sprint tabata — single mono movement (e.g., running sprints)
    "TABATA::sprint": {
        durationRange: [4, 4],
        movementCount: [1, 1],
        repMultiplier: 0.0,          // distance-based, not rep-based
        loadFraction: 0.0,
        forceMonostructural: true,   // running, bike, row only
    },

    // ── CHIPPER ───────────────────────────────────────────────────────────
    "CHIPPER::aerobic": {
        durationRange: [25, 40],
        movementCount: [4, 6],
        rounds: 1,                   // one-time high-rep task list
        repMultiplier: 1.80,
        loadFraction: 0.40,
    },

    // ── DEATH_BY ──────────────────────────────────────────────────────────
    "DEATH_BY::short_metcon": {
        durationRange: [10, 20],
        movementCount: [1, 2],
        repMultiplier: 0.0,          // ascending +1 per minute: base rep is always 1
        loadFraction: 0.55,
    },

    // ── LADDER ─────────────────────────────────────────────────────────────
    "LADDER::sprint": {
        durationRange: [7, 10],
        movementCount: [1, 2],
        repMultiplier: 0.0,          // ladder: ascending reps defined by protocol
        loadFraction: 0.60,
    },
    "LADDER::short_metcon": {
        durationRange: [10, 15],
        movementCount: [1, 2],
        repMultiplier: 0.0,
        loadFraction: 0.55,
    },
    "LADDER::aerobic": {
        durationRange: [15, 25],
        movementCount: [1, 2],
        repMultiplier: 0.0,
        loadFraction: 0.50,
    },

    // ── STRENGTH_SINGLE ───────────────────────────────────────────────────
    "STRENGTH_SINGLE::strength": {
        durationRange: [15, 25],
        movementCount: [1, 1],
        repMultiplier: 0.20,         // heavy singles — very few reps
        loadFraction: 0.90,
    },

    // ── STRENGTH_SETS ─────────────────────────────────────────────────────
    "STRENGTH_SETS::strength": {
        durationRange: [15, 25],
        movementCount: [1, 2],
        repMultiplier: 0.40,         // 5×3, 4×5 type volume
        loadFraction: 0.80,
    },

    // ── INTERVAL ──────────────────────────────────────────────────────────
    "INTERVAL::aerobic": {
        durationRange: [25, 40],
        movementCount: [2, 3],
        repMultiplier: 0.90,
        loadFraction: 0.50,
        intervalWorkSec: 180,        // 3 min work
        intervalRestSec: 90,         // 90 sec rest
    },
    "INTERVAL::short_metcon": {
        durationRange: [15, 25],
        movementCount: [2, 3],
        repMultiplier: 0.80,
        loadFraction: 0.55,
        intervalWorkSec: 120,        // 2 min work
        intervalRestSec: 60,         // 1 min rest
    },
};

// ─── Stimulus Fallback Map ────────────────────────────────────────────────
// When an exact protocol::stimulus key is missing, fall back to the
// protocol's most natural stimulus context.

const PROTOCOL_DEFAULT_STIMULUS: Partial<Record<WodProtocol, StimulusTarget>> = {
    FOR_TIME: "short_metcon",
    AMRAP: "short_metcon",
    EMOM: "short_metcon",
    "21_15_9": "sprint",
    TABATA: "sprint",
    CHIPPER: "aerobic",
    DEATH_BY: "short_metcon",
    LADDER: "sprint",
    INTERVAL: "aerobic",
    STRENGTH_SINGLE: "strength",
    STRENGTH_SETS: "strength",
};

// ─── REST_DAY Blueprint ───────────────────────────────────────────────────

const REST_DAY_BLUEPRINT: ProtocolBlueprint = {
    durationRange: [0, 0],
    movementCount: [0, 0],
    repMultiplier: 0,
    loadFraction: 0,
};

// ─── Blueprint Resolver ───────────────────────────────────────────────────

/**
 * Resolve the coaching blueprint for a given protocol × stimulus × tier.
 *
 * Lookup order:
 *  1. Exact key  "PROTOCOL::STIMULUS"
 *  2. Fallback   "PROTOCOL::DEFAULT_STIMULUS"
 *  3. Emergency  generic defaults (should never be reached)
 *
 * Tier adjustments are applied as multipliers on top of the base blueprint.
 */
export function resolveBlueprint(
    protocol: WodProtocol,
    stimulus: StimulusTarget,
    tier: TierKey,
): ProtocolBlueprint {
    if (protocol === "REST_DAY") return REST_DAY_BLUEPRINT;

    // 1. Try exact match
    let base = BASE_BLUEPRINTS[`${protocol}::${stimulus}` as MatrixKey];

    // 2. Fallback to protocol's natural stimulus
    if (!base) {
        const fallbackStimulus = PROTOCOL_DEFAULT_STIMULUS[protocol];
        if (fallbackStimulus) {
            base = BASE_BLUEPRINTS[`${protocol}::${fallbackStimulus}` as MatrixKey];
        }
    }

    // 3. Emergency fallback — should never happen if the matrix is complete
    if (!base) {
        base = {
            durationRange: [10, 15],
            movementCount: [2, 3],
            repMultiplier: 1.0,
            loadFraction: 0.60,
        };
    }

    // Apply tier adjustments
    const adj = TIER_ADJUSTMENTS[tier];

    // Fixed duration protocols override tier adj
    const durationScaling = protocol === "TABATA" ? 1.0 : adj.duration;

    return {
        ...base,
        durationRange: [
            Math.round(base.durationRange[0] * durationScaling),
            Math.round(base.durationRange[1] * durationScaling),
        ],
        movementCount: base.movementCount,        // movement count stays constant across tiers
        rounds: base.rounds,
        repMultiplier: +(base.repMultiplier * adj.reps).toFixed(2),
        loadFraction: +(base.loadFraction * adj.load).toFixed(2),
        emomWindowSec: base.emomWindowSec,         // coach-default, not tier-adjusted
        intervalWorkSec: base.intervalWorkSec,
        intervalRestSec: base.intervalRestSec,
        forceMonostructural: base.forceMonostructural,
    };
}
