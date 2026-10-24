
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  Bot,
  Settings,
  Building2,
  ShieldCheck,
  LogOut,
  UserRound,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

// ==========================================
// NAVIGATION MENU
// ==========================================

const MENU_ITEMS = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Customers",
    path: "/customers",
    icon: Users,
  },
  {
    label: "Leads",
    path: "/leads",
    icon: Target,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    label: "AI Assistant",
    path: "/assistant",
    icon: Bot,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
] as const;

// ==========================================
// SIDEBAR COMPONENT
// ==========================================

export default function Sidebar() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] =
    useState(false);

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

  // ========================================
  // LOGOUT HANDLER
  // ========================================

  const handleLogout = () => {
    logout();

    setShowLogoutConfirm(false);

    navigate("/login", {
      replace: true,
    });
  };

  // ========================================
  // USER INITIALS
  // ========================================

  const userInitials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
    : "U";

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
        {/* ==================================
            BRAND HEADER
        ================================== */}

        <div className="border-b border-slate-100 px-5 py-6">
          <NavLink
            to="/"
            aria-label="DubaiBiz AI Dashboard"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <Building2
                size={25}
                aria-hidden="true"
              />
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

        {/* ==================================
            NAVIGATION LINKS
        ================================== */}

        <nav
          aria-label="Main navigation"
          className="flex gap-2 overflow-x-auto px-4 py-4 md:flex-1 md:flex-col md:overflow-y-auto md:px-4 md:py-6"
        >
          {menu.map(
            ({ label, path, icon: Icon }) => (
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
            )
          )}
        </nav>

        {/* ==================================
            ACCOUNT & LOGOUT
        ================================== */}

        <div className="border-t border-slate-200 p-4">
          {/* USER INFORMATION */}

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {userInitials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.name || "User"}
              </p>

              <p className="truncate text-xs text-slate-500">
                {user?.email || ""}
              </p>

              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <UserRound
                  size={12}
                  aria-hidden="true"
                />

                <span>
                  {isAdmin
                    ? "Administrator"
                    : "User Account"}
                </span>
              </div>
            </div>
          </div>

          {/* LOGOUT BUTTON */}

          <button
            type="button"
            onClick={() =>
              setShowLogoutConfirm(true)
            }
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors duration-200 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            <LogOut
              size={18}
              aria-hidden="true"
            />

            <span>Logout</span>
          </button>

          {/* FOOTER */}

          <div className="mt-4 text-center">
            <p className="text-xs font-medium text-slate-400">
              DubaiBiz AI
            </p>

            <p className="mt-1 text-xs text-slate-400">
              CRM & Business Management
            </p>
          </div>
        </div>
      </aside>

      {/* ==================================
          LOGOUT CONFIRMATION MODAL
      ================================== */}

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
              <LogOut
                size={26}
                aria-hidden="true"
              />
            </div>

            <h2
              id="logout-dialog-title"
              className="mt-4 text-center text-xl font-bold text-slate-900"
            >
              Confirm Logout
            </h2>

            <p
              id="logout-dialog-description"
              className="mt-2 text-center text-sm leading-6 text-slate-500"
            >
              Are you sure you want to log out
              of DubaiBiz AI?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
