/**
 * Deterministic daily seed utilities.
 *
 * dailySeed  — FNV-1a hash of "userId:YYYY-M-D:salt" → 32-bit unsigned integer.
 * SeededRng  — LCG pseudo-random number generator seeded from dailySeed.
 *
 * Same user on the same calendar day always produces the same seed,
 * so WOD generation is fully deterministic (no Math.random()).
 */

/**
 * FNV-1a 32-bit hash of an arbitrary string.
 * Returns a 32-bit unsigned integer.
 */
function fnv1a32(str: string): number {
    let hash = 2166136261; // FNV offset basis (32-bit)
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619); // FNV prime
        hash >>>= 0; // keep unsigned 32-bit
    }
    return hash;
}

/**
 * Builds a deterministic integer seed from a userId, optional salt, and date.
 * Defaults to today's calendar date in the server's local timezone.
 */
export function dailySeed(userId: string, salt: string = "", dateOverride?: Date): number {
    const now = dateOverride ?? new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return fnv1a32(`${userId}:${dateKey}:${salt}`);
}

/**
 * Linear Congruential Generator seeded from a 32-bit integer.
 * Produces floats in [0, 1) via next().
 */
export class SeededRng {
    private s: number;

    constructor(seed: number) {
        this.s = seed >>> 0;
    }

    next(): number {
        this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
        return this.s / 4294967296;
    }
}
