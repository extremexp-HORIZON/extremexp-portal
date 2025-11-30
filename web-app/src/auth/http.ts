import ky, { HTTPError } from "ky";
import { useAuthStore, getValidToken } from "./authStore";
import type { ApiError } from "./types";

/**
 * Configured Ky HTTP client instance with authentication handling.
 *
 * Features:
 * - Automatically attaches Authorization header if a valid token exists
 * - Handles 401/403 errors by clearing auth and redirecting to login
 * - Provides normalized error handling
 */
export const api = ky.create({
  // No prefixUrl - we use relative paths and Nginx proxy handles routing
  // See TODO-AUTH.md for proxy setup details
  retry: {
    limit: 0, // No automatic retries - we handle this manually if needed
  },
  timeout: 30000, // 30 second timeout
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getValidToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          // Clear auth state and mark as expired (session timeout)
          useAuthStore.getState().clearAuth({ expired: true });
          // Note: Navigation to login is handled by the useAuth hook in components
        }
        return response;
      },
    ],
  },
});

/**
 * Unauthenticated API client for login/register requests
 * These don't need the Authorization header
 * Uses VITE_AUTH_API_URL to point to the auth server
 */
export const publicApi = ky.create({
  prefixUrl: import.meta.env.VITE_AUTH_API_URL || "",
  retry: { limit: 0 },
  timeout: 30000,
});

/**
 * Parse an HTTPError into a user-friendly ApiError object
 */
export async function parseHttpError(error: unknown): Promise<ApiError> {
  if (error instanceof HTTPError) {
    try {
      const body = await error.response.json();
      return {
        message:
          (body as { message?: string }).message ||
          (body as { error?: string }).error ||
          `Request failed with status ${error.response.status}`,
        status: error.response.status,
        details: body,
      };
    } catch {
      return {
        message: `Request failed with status ${error.response.status}`,
        status: error.response.status,
      };
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message || "An unexpected error occurred",
    };
  }

  return {
    message: "An unexpected error occurred",
  };
}

/**
 * Type guard to check if an error is an HTTPError
 */
export function isHttpError(error: unknown): error is HTTPError {
  return error instanceof HTTPError;
}
