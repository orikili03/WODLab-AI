export const AUTH_STORAGE_KEY = "wodlab_token";

export function getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

/** Legacy cleanup: clear older key if it exists */
export function clearLegacyToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("wodlab_auth_token");
}
