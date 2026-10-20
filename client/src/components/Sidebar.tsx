
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  Bot,
  Settings,
  Building2,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const MENU_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Leads", path: "/leads", icon: Target },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "AI Assistant", path: "/assistant", icon: Bot },
  { label: "Settings", path: "/settings", icon: Settings },
] as const;

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const menu = [
    ...MENU_ITEMS,
    ...(isAdmin
      ? [
          {
            label: "Admin Panel",
            path: "/admin",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="border-b border-slate-100 px-5 py-6">
        <NavLink
          to="/"
          aria-label="DubaiBiz AI Dashboard"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Building2 size={25} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xl font-bold tracking-tight text-blue-700">
              DubaiBiz AI
            </p>
            <p className="text-xs text-slate-400">
              Business Management
            </p>
          </div>
        </NavLink>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex gap-2 overflow-x-auto px-4 py-4 md:flex-col md:overflow-x-visible md:px-4 md:py-6"
      >
        {menu.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              [
                "group flex shrink-0 items-center gap-3",
                "rounded-xl px-4 py-3",
                "text-sm font-semibold",
                "transition-colors duration-200",
                "focus-visible:outline-2",
                "focus-visible:outline-offset-2",
                "focus-visible:outline-blue-600",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-blue-700",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={19}
                  aria-hidden="true"
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-500 group-hover:text-blue-600"
                  }
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-slate-100 px-6 py-4 md:block">
        <p className="text-xs font-medium text-slate-400">
          DubaiBiz AI
        </p>
        <p className="mt-1 text-xs text-slate-400">
          CRM & Business Management
        </p>
      </div>
    </aside>
  );
}
