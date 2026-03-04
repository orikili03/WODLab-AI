import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from './AuthTokenContext';
import type { AuthUser } from './AuthTokenContext';

/**
 * Auth response shape — backend sets HttpOnly cookie and returns user info.
 */
type AuthResponse = {
    user: AuthUser;
};

/**
 * Hook for logging in.
 */
export function useLogin(): UseMutationResult<AuthResponse, Error, { email: string; password: string }, unknown> {
    const { onLoginSuccess } = useAuth();

    return useMutation<AuthResponse, Error, { email: string; password: string }>({
        mutationFn: async (credentials) => {
            const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
            return response.data;
        },
        onSuccess: (data) => {
            onLoginSuccess(data.user);
        },
    });
}

/**
 * Hook for registering a new user.
 */
export function useRegister(): UseMutationResult<AuthResponse, Error, { email: string; password: string }, unknown> {
    const { onLoginSuccess } = useAuth();

    return useMutation<AuthResponse, Error, { email: string; password: string }>({
        mutationFn: async (payload) => {
            const response = await apiClient.post<AuthResponse>('/auth/register', payload);
            return response.data;
        },
        onSuccess: (data) => {
            onLoginSuccess(data.user);
        },
    });
}
