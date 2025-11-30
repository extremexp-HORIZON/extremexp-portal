/**
 * Client configuration for authentication and error handling.
 *
 * This file configures the auto-generated OpenAPI client with:
 * - Bearer token authentication from the auth store
 * - Automatic 401/403 handling (clears auth state)
 *
 * Call `configureClient()` once at app startup (e.g., in main.tsx).
 */

import { client } from "../client/client.gen";
import { getValidToken, useAuthStore } from "../auth/authStore";

/**
 * Configure the API client with authentication and error handling.
 * Should be called once at application startup.
 */
export function configureClient(): void {
  // Add request interceptor to attach bearer token
  client.interceptors.request.use((request) => {
    const token = getValidToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  });

  // Add response interceptor to handle auth errors
  client.interceptors.response.use((response) => {
    if (response.status === 401 || response.status === 403) {
      // Clear auth state - navigation to login is handled by useAuth hook
      useAuthStore.getState().clearAuth();
    }
    return response;
  });
}
