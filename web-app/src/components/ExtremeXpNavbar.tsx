import Jdenticon from "react-jdenticon"
import { useAuth } from "../auth"

export default function ExtremeXpNavbar() {
  const { username, logout } = useAuth()

  const handleLogout = () => {
    logout()
    // Navigation to /auth is handled by ProtectedRoute in main.tsx
  }

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl text-blue-600 font-normal py-5">
          <img alt="" src="/extremeXP_logo.png" className="inline h-8 mr-2" />
          ExtremeXP
        </a>
      </div>
      <div className="flex gap-2">
        <div className="dropdown dropdown-end" id="user-menu">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-black no-shrink">
              <div className="relative right-1 bottom-1">
                <Jdenticon size="46" value={username || "user"} />
              </div>
            </div>
          </div>
          <ul
            tabIndex={-1}
            className="menu dropdown-content bg-base-100 rounded-box z-1 mt-1 w-52 p-2 shadow-2xl"
          >
            <li className="menu-title">
              <span className="text-xs opacity-60">Signed in as</span>
              <span className="font-semibold">{username}</span>
            </li>
            {/* <li>
              <a className="justify-between">
                Profile
                <span className="badge">New</span>
              </a>
            </li> */}
            {/* <li>
              <a>Settings</a>
            </li> */}
            <li>
              <button onClick={handleLogout} className="text-error">
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
