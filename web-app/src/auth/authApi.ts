import { publicApi, parseHttpError } from "./http";
import { useAuthStore } from "./authStore";
import { setDALAccessToken } from "../dal-client";
import type {
  LoginCredentials,
  RegisterCredentials,
  LoginResponse,
  RegisterResponse,
  ApiError,
} from "./types";

/**
 * Session storage key for DAL access token (must match useDALToken.ts)
 */
const DAL_TOKEN_STORAGE_KEY = 'dal-access-token';

const AUTH_BASE = "extreme_auth/api/v1/person";

/**
 * Authenticate user with username and password.
 * On success, stores the auth tokens in the auth store.
 *
 * @throws {ApiError} On authentication failure
 */
export async function login(credentials: LoginCredentials): Promise<void> {
  try {
    const response = await publicApi
      .post(`${AUTH_BASE}/login`, {
        json: credentials,
      })
      .json<LoginResponse>();

    // Store auth data (refresh token intentionally not stored - see security notes in authStore.ts)
    useAuthStore.getState().setAuth(
      credentials.username,
      response.access_token,
      response.expires_in
    );
  } catch (error) {
    const apiError = await parseHttpError(error);
    // Provide a more user-friendly message for auth failures
    if (apiError.status === 401 || apiError.status === 400) {
      apiError.message = "Invalid username or password";
    }
    throw apiError;
  }
}

/**
 * Register a new user account.
 *
 * @throws {ApiError} On registration failure
 */
export async function register(
  credentials: RegisterCredentials
): Promise<RegisterResponse> {
  try {
    const response = await publicApi
      .post(`${AUTH_BASE}/register`, {
        json: credentials,
      })
      .json<RegisterResponse>();

    return response;
  } catch (error) {
    const apiError = await parseHttpError(error);
    // Handle common registration errors with user-friendly messages
    if (apiError.status === 409) {
      apiError.message = "A user with this username or email already exists";
    } else if (apiError.status === 400) {
      // Keep the original message for validation errors
      apiError.message = apiError.message || "Invalid registration data";
    }
    throw apiError;
  }
}

/**
 * Log out the current user.
 * Clears all auth state from the store, local storage, and DAL access token.
 */
export function logout(): void {
  useAuthStore.getState().clearAuth();
  // Clear DAL access token from sessionStorage and client module
  sessionStorage.removeItem(DAL_TOKEN_STORAGE_KEY);
  setDALAccessToken(undefined);
}

/**
 * Type guard for ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiError).message === "string"
  );
}
