import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import logo from "../../assets/extremeXP_logo.png";
import { externalLinks } from "../../config/externalLinks";

const SESSION_EXPIRED_KEY = "session-expired";

type AuthTab = "login" | "register";

interface AuthPageProps {
  defaultTab?: AuthTab;
  redirectTo?: string;
}

/**
 * Session expired alert component - shown when user's session timed out
 */
function SessionExpiredAlert({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div role="alert" className="alert alert-warning shadow-lg mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div>
        <h3 className="font-bold">Session Expired</h3>
        <div className="text-xs">Your session has expired. Please log in again to continue.</div>
      </div>
      <button
        className="btn btn-sm btn-ghost"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * Authentication page with login and register tabs.
 * Uses DaisyUI hero layout with card for the form.
 *
 * Features:
 * - Tab navigation between Login and Register (URL-based)
 * - Auto-redirect if already logged in
 * - Success redirect after login/register
 * - Session expired warning when redirected due to timeout
 * - Responsive design
 */
export function AuthPage({
  defaultTab = "login",
  redirectTo = "/",
}: AuthPageProps) {
  // Read sessionStorage on mount
  const [sessionExpired, setSessionExpired] = useState(
    () => sessionStorage.getItem(SESSION_EXPIRED_KEY) === "true"
  );
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL
  const activeTab: AuthTab = location.pathname.includes("/register")
    ? "register"
    : defaultTab;

  const handleTabChange = (tab: AuthTab) => {
    if (tab === "register") {
      navigate("/auth/register");
    } else {
      navigate("/auth");
    }
  };

  const handleLoginSuccess = () => {
    // Clear any session expired flag on successful login
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    navigate(redirectTo, { replace: true });
  };

  const handleRegisterSuccess = () => {
    // Switch to login tab after successful registration
    navigate("/auth");
  };

  const handleDismissSessionExpired = () => {
    // Clear the session expired flag
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    setSessionExpired(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <div className="hero flex-1">
        <div className="hero-content w-full max-w-5xl flex-col lg:flex-row-reverse lg:gap-12">
          {/* Left side: Branding */}
          <div className="text-center lg:text-left lg:flex-1">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
              <img
                src={logo}
                alt="ExtremeXP Logo"
                className="h-16 w-auto"
              />
              <h1 className="text-4xl font-bold text-primary">ExtremeXP</h1>
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {activeTab === "login" ? "Welcome back!" : "Join us today!"}
            </h2>
            <p className="py-4 text-base-content/70">
              {activeTab === "login"
                ? "Sign in to access your experiments, workflows, and project dashboards."
                : "Create an account to start managing your machine learning experiments and workflows."}
            </p>
          </div>

          {/* Right side: Auth Form Card */}
          <div className="card w-full max-w-md shrink-0 bg-base-100 shadow-2xl">
            <div className="card-body">
              {/* Session Expired Alert */}
              {sessionExpired && (
                <SessionExpiredAlert onDismiss={handleDismissSessionExpired} />
              )}

              {/* Tab Navigation */}
              <div role="tablist" className="tabs tabs-box mb-6">
                <button
                  role="tab"
                  className={`tab flex-1 ${activeTab === "login" ? "tab-active" : ""}`}
                  onClick={() => handleTabChange("login")}
                >
                  Login
                </button>
                <button
                  role="tab"
                  className={`tab flex-1 ${activeTab === "register" ? "tab-active" : ""}`}
                  onClick={() => handleTabChange("register")}
                >
                  Register
                </button>
              </div>

              {/* Form Content */}
              {activeTab === "login" ? (
                <LoginForm onSuccess={handleLoginSuccess} />
              ) : (
                <RegisterForm onSuccess={handleRegisterSuccess} />
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="py-4 text-center text-xs text-base-content/60">
        <a
          href={externalLinks.projectPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-hover"
        >
          ExtremeXP Project
        </a>
        <span className="mx-2">•</span>
        <a
          href={externalLinks.privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-hover"
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
