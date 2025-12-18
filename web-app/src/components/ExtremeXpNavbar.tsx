// Search box extracted to its own component
// @ts-expect-error - react-jdenticon has no type declarations
import Jdenticon from "react-jdenticon"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useMemo } from "react"
import { useAuth } from "../auth"
import { findToolByRoute } from "../config"
import SearchFilterInput from "./SearchFilterInput"

export default function ExtremeXpNavbar() {
  const { username, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  // Check if we're on an external frame route and get the tool config
  const toolConfig = findToolByRoute(location.pathname)
  const isExternalRoute = !!toolConfig

  // Build the external URL for the "open in new tab" action
  const externalUrl = useMemo(() => {
    if (!toolConfig) return null
    return toolConfig.buildExternalUrl(params as Record<string, string>)
  }, [toolConfig, params])

  const handleLogout = () => {
    logout()
    // Navigation to /auth is handled by ProtectedRoute in main.tsx
  }

  const handleCloseExternalTool = () => {
    navigate("/")
  }

  const handleOpenInNewTab = () => {
    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer")
      navigate("/")
    }
  }

  return (
    <div className="navbar bg-base-100 h-14 min-h-14 px-4 border-b border-base-200">
      {/* Left section: Logo and breadcrumb */}
      <div className="navbar-start gap-1">
        {/* Logo / Home */}
        <Link to="/" className="btn btn-ghost gap-2 text-lg font-semibold text-primary px-2">
          <img alt="" src="/extremeXP_logo.png" className="h-7" />
          <span className="hidden sm:inline">ExtremeXP</span>
        </Link>

        {/* External tool breadcrumb with badge and action buttons */}
        {isExternalRoute && toolConfig && (
          <>
            <span className="text-base-content/30 mx-2">/</span>
            <div className="badge badge-primary badge-soft gap-1.5 pl-3 pr-0 py-4">
              <span className="text-sm font-medium whitespace-nowrap">
                {toolConfig.title}
              </span>
              {/* Joined action buttons */}
              <div className="join">
                {/* Open in new tab button */}
                <div className="tooltip tooltip-bottom" data-tip={`Open ${toolConfig.title} in new tab`}>
                  <button
                    onClick={handleOpenInNewTab}
                    className="btn btn-ghost btn-sm btn-circle join-item"
                    aria-label={`Open ${toolConfig.title} in new tab`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </button>
                </div>
                {/* Close button */}
                <div className="tooltip tooltip-bottom" data-tip="Close and return to dashboard">
                  <button
                    onClick={handleCloseExternalTool}
                    className="btn btn-ghost btn-sm btn-circle join-item hover:btn-error"
                    aria-label="Close and return to dashboard"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right section: Search and user menu */}
      <div className="navbar-end gap-3">
        {/* Global Search Box - hide when in external frame */}
        {!isExternalRoute && <SearchFilterInput />}

        {/* User dropdown menu */}
        <div className="dropdown dropdown-end" id="user-menu">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full overflow-hidden bg-black">
              <div className="relative right-1 bottom-1">
                <Jdenticon size="46" value={username || "user"} />
              </div>
            </div>
          </div>
          <ul
            tabIndex={-1}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow-lg"
          >
            <li className="menu-title">
              <span className="text-xs opacity-60">Signed in as</span>
              <span className="font-semibold">{username}</span>
            </li>
            <div className="divider my-0" />
            <li>
              <button onClick={handleLogout} className="text-error">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                  />
                </svg>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
