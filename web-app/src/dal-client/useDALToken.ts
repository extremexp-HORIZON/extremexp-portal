import { useState, useCallback, useSyncExternalStore } from 'react';
import { setDALAccessToken } from './client';

/**
 * Session storage key for DAL access token
 *
 * SECURITY NOTE: Storing access tokens in sessionStorage is NOT secure for production.
 * This is a temporary solution for PoC/prototype purposes only.
 * In production, tokens should be handled via httpOnly cookies or a proper auth flow.
 *
 * Known limitations:
 * - Tokens are accessible via JavaScript (XSS vulnerability)
 * - Tokens persist until the tab is closed
 * - No automatic token refresh mechanism
 */
const DAL_TOKEN_STORAGE_KEY = 'dal-access-token';

/**
 * Subscribe to storage changes (for useSyncExternalStore)
 */
const subscribeToStorage = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

/**
 * Get the current token from sessionStorage
 */
const getTokenSnapshot = (): string | null => {
  return sessionStorage.getItem(DAL_TOKEN_STORAGE_KEY);
};

/**
 * Server snapshot (SSR) - always null
 */
const getServerSnapshot = (): string | null => null;

/**
 * Hook to manage DAL access token stored in sessionStorage
 *
 * Syncs with the DAL client module when the token changes.
 *
 * @returns Tuple of [token, setToken, clearToken]
 */
export const useDALToken = (): [
  token: string | null,
  setToken: (token: string) => void,
  clearToken: () => void,
] => {
  // Force re-render when token changes locally (storage event doesn't fire for same-tab changes)
  const [, setForceUpdate] = useState(0);

  // Subscribe to storage changes from other tabs
  const storedToken = useSyncExternalStore(
    subscribeToStorage,
    getTokenSnapshot,
    getServerSnapshot,
  );

  const setToken = useCallback((token: string) => {
    sessionStorage.setItem(DAL_TOKEN_STORAGE_KEY, token);
    // Sync with DAL client module
    setDALAccessToken(token);
    // Force re-render for same-tab updates
    setForceUpdate((n) => n + 1);
  }, []);

  const clearToken = useCallback(() => {
    sessionStorage.removeItem(DAL_TOKEN_STORAGE_KEY);
    // Clear from DAL client module
    setDALAccessToken(undefined);
    // Force re-render for same-tab updates
    setForceUpdate((n) => n + 1);
  }, []);

  return [storedToken, setToken, clearToken];
};

/**
 * Initialize the DAL client with the stored token on app startup
 * Call this once in your app initialization
 */
export const initializeDALTokenFromStorage = (): void => {
  const token = sessionStorage.getItem(DAL_TOKEN_STORAGE_KEY);
  if (token) {
    setDALAccessToken(token);
  }
};
