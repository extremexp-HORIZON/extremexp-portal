import { useEffect, useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { findToolByRoute } from "../config"

/**
 * A fullscreen iframe page that displays external tools embedded within the portal.
 *
 * The iframe takes the full available height.
 * The URL and title are computed from the route parameters.
 * Navigation controls are in the main navbar.
 */
export function ExternalFrame() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  // Find the tool config based on the current route
  const toolConfig = useMemo(
    () => findToolByRoute(location.pathname),
    [location.pathname]
  )

  // Build the external URL from route params
  const frameUrl = useMemo(() => {
    if (!toolConfig) return null
    return toolConfig.buildExternalUrl(params as Record<string, string>)
  }, [toolConfig, params])

  const frameTitle = toolConfig?.title || "External Tool"

  // If no valid tool found, redirect to home
  useEffect(() => {
    if (!toolConfig || !frameUrl) {
      navigate("/", { replace: true })
    }
  }, [toolConfig, frameUrl, navigate])

  if (!toolConfig || !frameUrl) {
    return null
  }

  return (
    <iframe
      src={frameUrl}
      title={frameTitle}
      className="flex-1 w-full border-0"
      allow="clipboard-write; clipboard-read"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
    />
  )
}
