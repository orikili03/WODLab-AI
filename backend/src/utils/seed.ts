/**
 * Deterministic daily seed generator with optional salt.
 */
export function dailySeed(userId: string, salt: string = "", overrideDate?: Date): number {
    const now = overrideDate || new Date();
    // Daily granularity + user identity + salt for variety
    const str = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${userId}${salt}`;
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * Minimal Seeded LCG for deterministic variety.
 */
export class SeededRng {
    private state: number;
    constructor(seed: number) { this.state = seed >>> 0; }

    next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    choice<T>(arr: T[]): T {
        return arr[Math.floor(this.next() * arr.length)];
    }
}
