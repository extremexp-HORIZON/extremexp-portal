import { Outlet, useLocation } from "react-router-dom"
import ExtremeXpNavbar from "./ExtremeXpNavbar"
import { Footer } from "./Footer"
import { findToolByRoute } from "../config"

/**
 * Main layout component that wraps all protected pages.
 * Provides the shared navbar and footer, with content rendered via Outlet.
 */
export function MainLayout() {
  const location = useLocation()
  const isExternalRoute = !!findToolByRoute(location.pathname)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 bg-base-100 shadow-sm">
        <ExtremeXpNavbar />
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
      {/* Hide footer on external routes to maximize iframe space */}
      {!isExternalRoute && <Footer />}
    </div>
  )
}
