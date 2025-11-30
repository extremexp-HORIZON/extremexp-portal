/**
 * Authentication types
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token: string;
  "not-before-policy": number;
  session_state: string;
  scope: string;
}

export interface RegisterResponse {
  id: string;
  createdTimestamp: number;
  username: string;
  enabled: boolean;
  totp: boolean;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  email: string;
  attributes: object[];
  disableableCredentialTypes: object[];
  requiredActions: object[];
  notBefore: number;
  access: object[];
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  accessToken: string | null;
  expiresAt: number | null;
}

export interface AuthActions {
  /**
   * Set authentication state after successful login.
   * Note: Refresh tokens are intentionally NOT stored client-side for security.
   * When backend implements token refresh, it should use HttpOnly cookies.
   */
  setAuth: (username: string, accessToken: string, expiresIn: number) => void;
  clearAuth: () => void;
}

export type AuthStore = AuthState & AuthActions;

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}
