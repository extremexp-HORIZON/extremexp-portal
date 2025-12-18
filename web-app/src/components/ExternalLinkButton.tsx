import type { ReactNode, MouseEvent, AnchorHTMLAttributes } from "react"
import { useNavigate } from "react-router-dom"
import { getExternalToolRoute, type ExternalToolId } from "../config"

export interface ExternalLinkButtonProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick" | "href"> {
  /** The external tool identifier */
  toolId: ExternalToolId
  /** Route parameters (e.g., { experimentId: "123" }) */
  params?: Record<string, string | number>
  /** The external URL (for native open in new tab) */
  externalUrl: string
  /** Button content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * A link button that opens external tools in an embedded iframe.
 *
 * **Behavior:**
 * - Normal click → Opens in embedded iframe view at the tool's route
 * - Ctrl/Cmd + click → Opens in new tab (native browser behavior)
 * - Right-click → Context menu to open in new tab
 *
 * This keeps the <a href> intact so power users can still use native browser
 * behavior to open in new tabs/windows.
 */
export function ExternalLinkButton({
  toolId,
  params,
  externalUrl,
  children,
  className,
  ...rest
}: ExternalLinkButtonProps) {
  const navigate = useNavigate()

  // Compute the internal route for this tool
  const internalRoute = getExternalToolRoute(toolId, params)

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Allow native behavior for modifier keys (new tab)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }

    // Prevent default navigation and open in iframe instead
    e.preventDefault()

    // Navigate to the internal external frame route
    navigate(internalRoute)
  }

  return (
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      {...rest}
    >
      {children}
    </a>
  )
}
