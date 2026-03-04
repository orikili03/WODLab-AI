import { Movement, type IMovement } from "../models/Movement.js";

/**
 * MovementCacheService
 * 
 * In-memory cache for the entire Movement Library.
 * Since the movement catalog is relatively small and static,
 * keeping it in memory eliminates hundreds of database round-trips.
 */
export class MovementCacheService {
    private cache: IMovement[] | null = null;
    private lastFetch: number = 0;
    private readonly TTL_MS = 1000 * 60 * 60; // 1 hour

    /**
     * Initialize the cache by fetching all movements from the DB.
     * Use this at server startup to eagerly load the cache.
     */
    async init(): Promise<void> {
        try {
            this.cache = await Movement.find({}, { __v: 0 }).lean() as unknown as IMovement[];
            this.lastFetch = Date.now();
        } catch (err) {
            // Cache stays null — getAll() will retry on first request
            console.error("MovementCacheService: failed to initialize cache on startup", err);
        }
    }

    /**
     * Get all movements, using cache if available and fresh.
     */
    async getAll(): Promise<IMovement[]> {
        const now = Date.now();
        if (this.cache && (now - this.lastFetch < this.TTL_MS)) {
            return this.cache;
        }

        this.cache = await Movement.find({}, { __v: 0 }).lean() as unknown as IMovement[];
        this.lastFetch = now;
        return this.cache;
    }

    /**
     * Force refresh the cache (e.g. after seeding or library updates).
     */
    async refresh(): Promise<void> {
        this.cache = null;
        await this.getAll();
    }

    /**
     * Find movements by specific criteria in-memory.
     */
    async find(filter: (m: IMovement) => boolean): Promise<IMovement[]> {
        const all = await this.getAll();
        return all.filter(filter);
    }
}

export const movementCacheService = new MovementCacheService();
