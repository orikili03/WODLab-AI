import type { HydratedContext } from "./scoring/WodHydrationService.js";
import type { WodCategory, WodProtocol } from "./WodAssemblyService.js";
import { dailySeed } from "../utils/seed.js";

// ─── Composition Types ────────────────────────────────────────────────────

export type SlotRequirement = "required" | "preferred" | "optional" | "excluded";

export interface ModalityComposition {
    G: SlotRequirement;
    W: SlotRequirement;
    M: SlotRequirement;
}

// ─── Stimulus Intent ──────────────────────────────────────────────────────

export interface StimulusIntent {
    target: "sprint" | "short_metcon" | "aerobic" | "strength" | "skill";
    /** Constrained pool for seeded protocol pick — never empty */
    allowedProtocols: WodProtocol[];
    /** Controls loaded-movement filtering in slot fill */
    movementComplexity: "simple" | "moderate" | "advanced";
    /** G/W/M slot requirements for composition-directed slot fill */
    modalityComposition: ModalityComposition;
    /** Audit log — surfaced in debug logging */
    reason: string;
}

// ─── Coaching Constants ───────────────────────────────────────────────────

/** Niche protocols that must not appear in consecutive sessions */
const NICHE_PROTOCOLS = new Set<WodProtocol>([
    "TABATA", "DEATH_BY", "LADDER", "21_15_9", "CHIPPER",
]);

/**
 * Protocols that indicate a high-intensity glycolytic/phosphagen session.
 * 3+ consecutive of these → steer the next metcon toward aerobic pacing.
 */
const GLYCOLYTIC_PROTOCOLS = new Set<WodProtocol>([
    "TABATA", "21_15_9", "DEATH_BY", "FOR_TIME", "STRENGTH_SINGLE",
]);

/** Strength-focused protocols for "no recent strength" detection */
const STRENGTH_PROTOCOLS = new Set<WodProtocol>([
    "STRENGTH_SINGLE", "STRENGTH_SETS",
]);

// ─── Base Protocol Pools (before context-based pruning) ──────────────────

const BASE_SPRINT_POOL: WodProtocol[] = [
    "21_15_9", "TABATA", "FOR_TIME", "STRENGTH_SINGLE", "LADDER",
];
const BASE_METCON_POOL: WodProtocol[] = [
    "AMRAP", "EMOM", "FOR_TIME", "DEATH_BY", "LADDER",
];
const BASE_LONG_POOL: WodProtocol[] = [
    "CHIPPER", "AMRAP", "INTERVAL", "STRENGTH_SETS", "LADDER",
];

// ─── StimulusIntentService ────────────────────────────────────────────────

/**
 * StimulusIntentService
 *
 * Reads HydratedContext and returns a StimulusIntent before any protocol
 * selection. Pure function — zero DB calls, zero side effects.
 *
 * Coaching decisions applied:
 *  - Niche protocols (TABATA, DEATH_BY, LADDER, 21_15_9, CHIPPER) are excluded
 *    from the allowed pool if they appeared in the last 3 sessions.
 *  - Sprint sessions always get movementComplexity: "simple" (no loaded movements).
 *  - 3+ consecutive glycolytic sessions steer the next metcon toward aerobic protocols.
 *  - RX athlete with no recent strength → STRENGTH_SETS guaranteed in long pool.
 *  - ~20% of metcon sessions are "surprise G+W days" (no monostructural element).
 *    Deterministic via daily seed — same athlete gets same surprise on the same day.
 */
export class StimulusIntentService {

    /**
     * Resolve a StimulusIntent for today's session.
     *
     * @param category    WOD time domain: "sprint" | "metcon" | "long"
     * @param context     Pre-fetched HydratedContext
     * @param userId      Used for the seeded 20% surprise metcon roll
     * @param salt        Daily salt for seed variety
     * @param dateOverride  Optional date override (tests)
     */
    resolve(
        category: WodCategory,
        context: HydratedContext,
        userId: string,
        salt: string = "",
        dateOverride?: Date,
    ): StimulusIntent {
        const recentSessions = context.history.slice(0, 3);

        // Extract protocol names from the 3 most recent sessions
        const recentProtocols = recentSessions
            .map(s => s.protocol)
            .filter((p): p is WodProtocol => Boolean(p));

        // Build the set of niche protocols that appeared recently
        const recentNiches = new Set(
            recentProtocols.filter(p => NICHE_PROTOCOLS.has(p))
        );

        if (category === "sprint") {
            return this.resolveSprint(recentNiches);
        }
        if (category === "metcon") {
            return this.resolveMetcon(
                recentNiches, context, userId, salt, dateOverride
            );
        }
        return this.resolveLong(recentNiches, context);
    }

    // ── Sprint ────────────────────────────────────────────────────────────

    private resolveSprint(
        recentNiches: Set<WodProtocol>,
    ): StimulusIntent {
        const reasons: string[] = [];

        // Remove recently-used niche protocols from the sprint pool
        let allowed = BASE_SPRINT_POOL.filter(p => !recentNiches.has(p));
        if (recentNiches.size > 0) {
            reasons.push(`excluded niche(s): ${[...recentNiches].join(", ")}`);
        }

        // Safety fallback — always keep a viable sprint pool
        if (allowed.length === 0) {
            allowed = ["FOR_TIME", "21_15_9"];
            reasons.push("all niche exclusions bypassed (fallback pool)");
        }

        return {
            target: "sprint",
            allowedProtocols: allowed,
            // Sprint is always simple: high reps, no heavy barbell complexity
            movementComplexity: "simple",
            // Sprint = G + W with possible cardio burst; M is optional not dominant
            modalityComposition: { G: "required", W: "required", M: "optional" },
            reason: `Sprint: simple complexity, G+W required. ${reasons.join("; ")}`,
        };
    }

    // ── Metcon ────────────────────────────────────────────────────────────

    private resolveMetcon(
        recentNiches: Set<WodProtocol>,
        context: HydratedContext,
        userId: string,
        salt: string,
        dateOverride?: Date,
    ): StimulusIntent {
        const reasons: string[] = [];

        let allowed = BASE_METCON_POOL.filter(p => !recentNiches.has(p));
        if (recentNiches.size > 0) {
            reasons.push(`excluded niche(s): ${[...recentNiches].join(", ")}`);
        }
        if (allowed.length === 0) {
            allowed = ["AMRAP", "EMOM", "FOR_TIME"];
            reasons.push("all niche exclusions bypassed (fallback pool)");
        }

        // 3+ consecutive glycolytic sessions → steer toward aerobic pacing
        const recentSessions = context.history.slice(0, 3);
        const allGlycolytic =
            recentSessions.length >= 3 &&
            recentSessions.every(
                s => s.protocol && GLYCOLYTIC_PROTOCOLS.has(s.protocol as WodProtocol)
            );

        if (allGlycolytic) {
            const aerobicOnly = allowed.filter(p =>
                ["AMRAP", "EMOM", "INTERVAL"].includes(p)
            );
            allowed = aerobicOnly.length > 0 ? aerobicOnly : ["AMRAP", "EMOM"];
            reasons.push("3+ consecutive glycolytic sessions: steering aerobic");
        }

        // ~20% surprise: pure G+W metcon session (no monostructural element)
        // Deterministic via daily seed — (seed % 5) === 0 gives exactly 1-in-5
        const seed = dailySeed(userId, salt, dateOverride);
        const isSurpriseGW = (seed % 5) === 0;

        const composition: ModalityComposition = isSurpriseGW
            ? { G: "required", W: "required", M: "excluded" }
            : { G: "preferred", W: "preferred", M: "preferred" };

        if (isSurpriseGW) {
            reasons.push("surprise G+W day: no monostructural element");
        }

        const movementComplexity = context.fitnessLevel === "rx" ? "moderate" : "simple";

        return {
            target: "short_metcon",
            allowedProtocols: allowed,
            movementComplexity,
            modalityComposition: composition,
            reason: `Metcon: ${movementComplexity} complexity. ${reasons.join("; ")}`,
        };
    }

    // ── Long / Aerobic ────────────────────────────────────────────────────

    private resolveLong(
        recentNiches: Set<WodProtocol>,
        context: HydratedContext,
    ): StimulusIntent {
        const reasons: string[] = [];
        const allSessions = context.history;

        let allowed = BASE_LONG_POOL.filter(p => !recentNiches.has(p));
        if (recentNiches.size > 0) {
            reasons.push(`excluded niche(s): ${[...recentNiches].join(", ")}`);
        }
        if (allowed.length === 0) {
            allowed = ["AMRAP", "INTERVAL"];
            reasons.push("all niche exclusions bypassed (fallback pool)");
        }

        // RX athlete with no strength in full history window → guarantee STRENGTH_SETS
        const noRecentStrength = allSessions.every(
            s => !s.protocol || !STRENGTH_PROTOCOLS.has(s.protocol as WodProtocol)
        );

        if (context.fitnessLevel === "rx" && noRecentStrength) {
            if (!allowed.includes("STRENGTH_SETS")) {
                allowed.push("STRENGTH_SETS");
            }
            reasons.push("RX + no recent strength: STRENGTH_SETS guaranteed in pool");
        }

        // If STRENGTH_SETS is the differentiating add-on, lean the composition toward W
        const strengthFocused =
            context.fitnessLevel === "rx" && noRecentStrength;

        const composition: ModalityComposition = strengthFocused
            ? { G: "optional", W: "required", M: "excluded" }
            : { G: "preferred", W: "optional", M: "required" };

        const movementComplexity = context.fitnessLevel === "rx" ? "advanced" : "moderate";

        return {
            target: strengthFocused ? "strength" : "aerobic",
            allowedProtocols: allowed,
            movementComplexity,
            modalityComposition: composition,
            reason: `Long: ${movementComplexity} complexity, ${strengthFocused ? "strength" : "aerobic"} target. ${reasons.join("; ")}`,
        };
    }
}

// Singleton export
export const stimulusIntentService = new StimulusIntentService();
