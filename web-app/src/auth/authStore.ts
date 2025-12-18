import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthStore } from "./types";

const initialState = {
  isAuthenticated: false,
  username: null,
  accessToken: null,
  expiresAt: null,
};

/**
 * Authentication store using Zustand with persistence.
 * Stores auth state in localStorage to maintain sessions across page reloads.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      /**
       * Set authentication state after successful login.
       * Note: Refresh tokens are intentionally NOT stored client-side for security.
       * When backend implements token refresh, it should use HttpOnly cookies.
       */
      setAuth: (username, accessToken, expiresIn) => {
        const expiresAt = Date.now() + expiresIn * 1000;
        set({
          isAuthenticated: true,
          username,
          accessToken,
          expiresAt,
        });
      },

      clearAuth: () => {
        set(initialState);
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
      }),
    }
  )
);

/**
 * Check if the current token is expired or about to expire (within 60 seconds)
 */
export const isTokenExpired = (): boolean => {
  const { expiresAt } = useAuthStore.getState();
  if (!expiresAt) return true;
  // Consider expired if within 60 seconds of expiry
  return Date.now() >= expiresAt - 60000;
};

/**
 * Get the current access token if valid
 */
export const getValidToken = (): string | null => {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken || isTokenExpired()) return null;
  return accessToken;
};
