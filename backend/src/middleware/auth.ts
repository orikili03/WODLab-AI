import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// ─── Auth Guard ───────────────────────────────────────────────────────────
// Reads JWT exclusively from HttpOnly cookie.
// Single-service deployment (backend serves frontend) makes cookies first-party,
// eliminating the need for a localStorage/Bearer fallback.
// ──────────────────────────────────────────────────────────────────────────

export const AUTH_COOKIE_NAME = "wodlab_session";

export interface AuthPayload {
    sub: string; // userId
    email: string;
}

// Extend Express Request to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
    const token: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        req.userId = decoded.sub;
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }
}

export function signToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
}

/**
 * Set the JWT as an HttpOnly cookie on the response.
 */
export function setAuthCookie(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
    });
}

/**
 * Clear the auth cookie (logout).
 */
export function clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}

