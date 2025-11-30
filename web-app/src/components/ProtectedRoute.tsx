import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { isTokenExpired } from '../auth/authStore'
import { logout } from '../auth/authApi'

/**
 * Protected route wrapper - redirects to login if not authenticated.
 * If the session expired (token timed out), adds ?expired query param to show a message.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAuthenticated } = useAuth()

  if (isLoggedIn) {
    return <>{children}</>
  }

  // Check if this is an expired session (was authenticated but token expired)
  const isExpiredSession = isAuthenticated && isTokenExpired()

  // Clear auth state before redirecting
  if (isAuthenticated) {
    logout()
  }

  // Redirect to auth page, with ?expired param if session expired
  const redirectPath = isExpiredSession ? '/auth?expired' : '/auth'
  return <Navigate to={redirectPath} replace />
}
