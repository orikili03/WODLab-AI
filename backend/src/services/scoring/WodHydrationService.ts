import { Workout } from "../../models/Workout.js";
import { User } from "../../models/User.js";
import { movementCacheService } from "../MovementCacheService.js";
import type { FitnessLevel } from "../../models/User.js";
import type { Modality } from "../../models/Movement.js";

// ─── Hydration Types ──────────────────────────────────────────────────────

/** A single session from the athlete's recent history, re-classified
 *  against the live movement library (not the stale DB movementEmphasis). */
export interface HistoricalSession {
    /** ISO date of the session */
    date: Date;
    /** Exact movement names that appeared in the WOD (from movementItems) */
    movementNames: string[];
    /** Movement families (e.g. "squat", "hinge") re-resolved from live library */
    patterns: string[];
    /** G / W / M modalities re-resolved from live library */
    modalities: Modality[];
    /** Age of the session in hours at call time */
    ageHours: number;
}

/** Pre-scored athlete context passed into WodAssemblyService */
export interface HydratedContext {
    fitnessLevel: FitnessLevel;
    goals: string[];
    /** Up to 5 recent sessions, newest first (matches DB sort: _id: -1) */
    history: HistoricalSession[];
    /** True when the athlete has no recorded history (cold start) */
    isColdStart: boolean;
}

// ─── Lookback window ─────────────────────────────────────────────────────
const LOOKBACK_DAYS = 5;

// ─── WodHydrationService ──────────────────────────────────────────────────

/**
 * WodHydrationService
 *
 * Fetches the athlete profile and recent workout history in a single
 * Promise.all (anti-N+1). Re-classifies historical movements against
 * the LIVE in-memory movement library to ensure the Methodist Matrix
 * always uses up-to-date modality and pattern data.
 */
export class WodHydrationService {

    /**
     * Fetch and build the HydratedContext for a given user.
     * Throws a 404-shaped error if the user does not exist.
     */
    async fetch(userId: string, nowOverride?: Date): Promise<HydratedContext> {
        const now = nowOverride || new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

        // ── Single round-trip: user profile + raw workout history ──────
        const [user, rawWorkouts] = await Promise.all([
            User.findById(userId).select("fitnessLevel goals").lean(),
            Workout.find({ userId, dateString: { $exists: true } })
                .sort({ _id: -1 })
                .limit(5)
                // Pull structured movementItems for name + family extraction
                .select("dateString timeString wod.movementItems.name wod.movementItems.family")
                .lean(),
        ]);

        if (!user) {
            const err = new Error("User not found");
            (err as NodeJS.ErrnoException).code = "USER_NOT_FOUND";
            throw err;
        }

        // ── Cold start: return zero-penalty context ────────────────────
        if (rawWorkouts.length === 0) {
            return {
                fitnessLevel: user.fitnessLevel as FitnessLevel,
                goals: user.goals ?? [],
                history: [],
                isColdStart: true,
            };
        }

        // ── Live library lookup (0 extra DB cost — already in-memory) ──
        const liveLibrary = await movementCacheService.getAll();
        const byName = new Map(
            liveLibrary.map((m) => [m.name.toLowerCase(), m])
        );

        const nowMs = now.getTime();

        const history: HistoricalSession[] = rawWorkouts.map((w: any) => {
            // Extract movement names from structured movementItems
            const items: Array<{ name: string; family?: string }> = w.wod?.movementItems ?? [];
            const movementNames: string[] = items.map((item) => item.name);

            const modalities = new Set<Modality>();
            const patterns = new Set<string>();

            for (const item of items) {
                const live = byName.get(item.name.trim().toLowerCase());
                if (!live) continue;

                // Re-classify modality from live library
                modalities.add(live.modality as Modality);

                // Use stored family if available, else fall back to live library
                const family = item.family ?? (live as unknown as Record<string, unknown>).family as string | undefined;
                if (family) patterns.add(family);
            }

            // Estimate ageHours from dateString + timeString
            const dateStr = w.dateString as string | undefined;
            const timeStr = w.timeString as string | undefined;
            let sessionDate: Date;
            if (dateStr && timeStr) {
                // Parse DD/MM/YYYY and HH:MM
                const [dd, mm, yyyy] = dateStr.split("/").map(Number);
                const [hh, min] = timeStr.split(":").map(Number);
                sessionDate = new Date(yyyy, mm - 1, dd, hh, min);
            } else {
                // Fallback to createdAt or now
                sessionDate = w.createdAt ? new Date(w.createdAt) : now;
            }
            const ageHours = (nowMs - sessionDate.getTime()) / (1000 * 60 * 60);

            return {
                date: sessionDate,
                movementNames,
                patterns: Array.from(patterns),
                modalities: Array.from(modalities),
                ageHours,
            };
        });

        return {
            fitnessLevel: user.fitnessLevel as FitnessLevel,
            goals: user.goals ?? [],
            history,
            isColdStart: false,
        };
    }
}

// Singleton export
export const wodHydrationService = new WodHydrationService();
