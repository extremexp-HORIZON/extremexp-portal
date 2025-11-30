import { useAuthStore, isTokenExpired } from "./authStore";
import { logout as logoutApi } from "./authApi";

/**
 * React hook for consuming authentication state and actions.
 * Provides a simple interface for components to check auth status and perform auth actions.
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const username = useAuthStore((state) => state.username);
  const accessToken = useAuthStore((state) => state.accessToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);

  /**
   * Check if the user is logged in with a valid (non-expired) token
   */
  const isLoggedIn = isAuthenticated && !isTokenExpired();

  /**
   * Perform logout - clears all auth state
   */
  const logout = () => {
    logoutApi();
  };

  return {
    isAuthenticated,
    isLoggedIn,
    username,
    accessToken,
    expiresAt,
    logout,
  };
}
