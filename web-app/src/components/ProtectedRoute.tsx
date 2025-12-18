import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useAuthStore, isTokenExpired } from '../auth/authStore'

const SESSION_EXPIRED_KEY = 'session-expired'

/**
 * Protected route wrapper - redirects to login if not authenticated.
 * If the session expired (token timed out), sets a sessionStorage flag.
 *
 * The useAuth hook handles proactive expiration detection for logged-in users.
 * This component handles the case where a user navigates to a protected route
 * after their session has expired.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAuthenticated, expiresAt } = useAuth()

  if (isLoggedIn) {
    return <>{children}</>
  }

  // Check if this is an expired session (had auth data but token expired)
  const isExpiredSession = expiresAt !== null && isTokenExpired()

  // Set expired flag in sessionStorage (clears on tab close/refresh)
  if (isExpiredSession) {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true')
  }

  // Clear auth state
  if (isAuthenticated) {
    useAuthStore.getState().clearAuth()
  }

  // Redirect to auth page
  return <Navigate to="/auth" replace />
}
