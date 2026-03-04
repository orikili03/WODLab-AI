import axios from "axios";

// Base URL for API requests — all backend routes are prefixed with /api.
// When VITE_API_BASE_URL is unset (single-service deployment), requests go to /api
// on the same origin — cookies are first-party, no cross-domain issues.
const envBase =
    typeof import.meta.env.VITE_API_BASE_URL === "string" && import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
        : "";

export const apiClient = axios.create({
    baseURL: `${envBase}/api`,
    withCredentials: true, // Send/receive HttpOnly cookies automatically
});

// Error response interceptor — normalize error messages
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || error.message || "An unexpected error occurred";
        error.message = message;
        return Promise.reject(error);
    }
);
