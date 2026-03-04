import axios from "axios";
import { getStoredToken } from "./authToken";

// Base URL for API requests — all backend routes are prefixed with /api
const envBase =
    typeof import.meta.env.VITE_API_BASE_URL === "string" && import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
        : "";

export const apiClient = axios.create({
    baseURL: `${envBase}/api`,
    withCredentials: true, // Send/receive HttpOnly cookies automatically
});

// Request interceptor — add Bearer token to headers if it exists
apiClient.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
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
