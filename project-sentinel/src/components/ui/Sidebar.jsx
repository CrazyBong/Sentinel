// src/components/ui/Sidebar.jsx
import { useState } from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Archive,
  BarChart3,
  Bot,
  Settings,
  LogOut,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import ShieldLogo from "@/assets/shield.png"

export default function Sidebar() {
  const [open, setOpen] = useState(true)

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/archive", label: "Campaign Archive", icon: Archive },
    { to: "/analytics", label: "Analytics & Trends", icon: BarChart3 },
    { to: "/assistant", label: "AI Assistant", icon: Bot },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/logout", label: "Logout", icon: LogOut },
  ]

  return (
    <aside
      className={`flex flex-col border-lg bg-purple-100 transition-all duration-300 ${
        open ? "w-52" : "w-16"
      }`}
    >
      {/* Top: toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-lg">
        {open && (
          <img
            src={ShieldLogo}
            alt="Sentinel Logo"
            className="h-8 w-8 object-contain"
          />
        )}
        <button
          onClick={() => setOpen(!open)}
          className="rounded p-1 hover:bg-purple-100"
        >
          {open ? (
            <PanelLeftClose className="h-5 w-5 text-purple-600" />
          ) : (
            <PanelLeftOpen className="h-5 w-5 text-purple-600" />
          )}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
  key={to}
  to={to}
  className={({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      label === "Logout"
        ? "text-gray-900 hover:bg-red-100 hover:text-red-800" // 🔴 logout hover red
        : isActive
        ? "bg-purple-200 text-purple-700"
        : "text-gray-700 hover:bg-purple-200 hover:text-purple-700"
    }`
  }
>
  <Icon className="h-5 w-5 shrink-0" />
  {open && <span>{label}</span>}
</NavLink>

        ))}
      </nav>

      {/* Bottom help button */}
      <div className="p-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-600">
          <HelpCircle className="h-4 w-4" />
          {open && "Get Help"}
        </button>
      </div>
    </aside>
  )
}
