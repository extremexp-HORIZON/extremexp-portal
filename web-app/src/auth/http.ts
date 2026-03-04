import ky, { HTTPError } from "ky";
import type { ApiError } from "./types";
import { resolveAuthApiBaseUrl } from "../api/runtimeUrls";

/**
 * Unauthenticated API client for login/register requests.
 * These don't need the Authorization header.
 * Uses VITE_AUTH_API_URL to point to the auth server.
 *
 * For authenticated API calls, use the generated OpenAPI client
 * configured in api/clientConfig.ts.
 */
export const publicApi = ky.create({
  prefixUrl: resolveAuthApiBaseUrl(),
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
