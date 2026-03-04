/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../lib/apiClient";
import { clearLegacyToken, setStoredToken, clearStoredToken } from "../../lib/authToken";

// ─── Types ────────────────────────────────────────────────────────────────
export type AuthUser = { id: string; email: string };

type AuthContextValue = {
    /** Whether the user is authenticated. */
    isAuthenticated: boolean;
    /** True while the initial session check is in progress. */
    isLoading: boolean;
    /** Basic user info from the session. */
    user: AuthUser | null;
    /** Call after a successful login/register to update UI state and store token. */
    onLoginSuccess: (user: AuthUser, token?: string) => void;
    /** Clear session (calls backend logout + wipes storage). */
    logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────
export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);

    // On mount: clean up legacy token + verify session (server-side cookie or header fallback)
    useEffect(() => {
        clearLegacyToken();

        apiClient
            .get<{ user: AuthUser }>("/auth/me")
            .then((res) => {
                setUser(res.data.user);
                setIsAuthenticated(true);
            })
            .catch(() => {
                setUser(null);
                setIsAuthenticated(false);
                clearStoredToken(); // Wipe maybe-stale token if check fails
            })
            .finally(() => setIsLoading(false));
    }, []);

    const onLoginSuccess = useCallback((userData: AuthUser, token?: string) => {
        if (token) setStoredToken(token);
        setUser(userData);
        setIsAuthenticated(true);
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiClient.post("/auth/logout");
        } catch {
            // Ignore network errors
        }
        setUser(null);
        setIsAuthenticated(false);
        clearStoredToken();
    }, []);

    const value: AuthContextValue = {
        isAuthenticated,
        isLoading,
        user,
        onLoginSuccess,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
    const ctx = React.useContext(AuthContext);
    if (ctx === null) {
        throw new Error("useAuth must be used within AuthTokenProvider");
    }
    return ctx;
}
