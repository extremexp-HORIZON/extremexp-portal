import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, isTokenExpired } from "./authStore";
import { logout as logoutApi } from "./authApi";

const SESSION_EXPIRED_KEY = 'session-expired';

/**
 * React hook for consuming authentication state and actions.
 * Provides a simple interface for components to check auth status and perform auth actions.
 *
 * Includes automatic session expiration detection - when the token expires,
 * it sets a sessionStorage flag and redirects to /auth.
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const username = useAuthStore((state) => state.username);
  const accessToken = useAuthStore((state) => state.accessToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  /**
   * Check if the user is logged in with a valid (non-expired) token
   */
  const isLoggedIn = isAuthenticated && !isTokenExpired();

  /**
   * Perform logout - clears all auth state
   */
  const logout = useCallback(() => {
    logoutApi();
  }, []);

  // Proactive token expiration check
  // Sets up a timer to check when the token will expire and redirects accordingly
  useEffect(() => {
    if (!isAuthenticated || !expiresAt) return;

    const checkExpiration = () => {
      if (isTokenExpired()) {
        // Set expired flag in sessionStorage, then clear auth and navigate
        sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');
        clearAuth();
        navigate("/auth");
      }
    };

    // Calculate time until expiration (with 60 second buffer matching isTokenExpired)
    const timeUntilExpiry = expiresAt - 60000 - Date.now();

    if (timeUntilExpiry > 0) {
      // Set a timer to trigger when the token expires
      const timer = setTimeout(checkExpiration, timeUntilExpiry);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, expiresAt, clearAuth, navigate]);

  return {
    isAuthenticated,
    isLoggedIn,
    username,
    accessToken,
    expiresAt,
    logout,
  };
}
