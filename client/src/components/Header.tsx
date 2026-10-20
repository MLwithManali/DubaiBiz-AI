
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings2 } from "lucide-react";

import { useAuth } from "../context/AuthContext";

// ==========================================
// PAGE CONFIGURATION
// ==========================================

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/leads": "Lead Management",
  "/analytics": "Business Analytics",
  "/assistant": "AI Assistant",
  "/settings": "Settings",
};

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": "Your business performance at a glance",
  "/dashboard": "Your business performance at a glance",
  "/customers": "Manage your customer relationships",
  "/leads": "Track and manage sales opportunities",
  "/analytics": "Explore your CRM performance",
  "/assistant": "Ask questions about your CRM data",
  "/settings": "Manage your account preferences",
};

// ==========================================
// HELPERS
// ==========================================

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "U";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

// ==========================================
// HEADER
// ==========================================

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const normalizedPath =
    pathname.length > 1
      ? pathname.replace(/\/+$/, "")
      : pathname;

  const title =
    PAGE_TITLES[normalizedPath] ?? "DubaiBiz AI";

  const description =
    PAGE_DESCRIPTIONS[normalizedPath] ??
    "AI-Powered CRM & Business Management";

  const displayName =
    typeof user?.name === "string" &&
    user.name.trim().length > 0
      ? user.name.trim()
      : "User";

  const initials = useMemo(
    () => getInitials(displayName),
    [displayName]
  );

  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
      {/* PAGE INFORMATION */}

      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {/* USER INFORMATION */}

      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <div className="hidden text-right sm:block">
          <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
            {displayName}
          </p>

          <p className="text-xs text-slate-500">
            {user?.role === "ADMIN"
              ? "Administrator"
              : "CRM User"}
          </p>
        </div>

        <Link
          to="/settings"
          aria-label={`Open account settings for ${displayName}`}
          title="Account Settings"
          className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 transition-colors hover:border-violet-200 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-bold text-white">
            {initials}
          </span>

          <Settings2
            size={17}
            className="text-slate-400 transition-colors group-hover:text-violet-600"
            aria-hidden="true"
          />
        </Link>
      </div>
    </header>
  );
}
