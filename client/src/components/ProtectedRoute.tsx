
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  AlertCircle,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

// ==========================================
// PROTECTED ROUTE
// ==========================================

export default function ProtectedRoute() {
  const {
    isAuthenticated,
    isLoading,
    authError,
    retryVerification,
    logout,
  } = useAuth();

  const location = useLocation();

  // ========================================
  // SESSION VERIFICATION IN PROGRESS
  // ========================================

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6"
      >
        <LoaderCircle
          size={36}
          className="animate-spin text-blue-600"
          aria-hidden="true"
        />

        <h2 className="text-lg font-semibold text-slate-900">
          Verifying your session
        </h2>

        <p className="text-sm text-slate-500">
          Please wait while we securely connect
          to DubaiBiz AI.
        </p>
      </div>
    );
  }

  // ========================================
  // TEMPORARY SERVER ERROR
  // ========================================

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div
          role="alert"
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <AlertCircle
              size={28}
              className="text-amber-600"
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Session Verification Unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {authError}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Your session has not been cleared.
            Please try again.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={retryVerification}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <RefreshCw
                size={17}
                aria-hidden="true"
              />
              Try Again
            </button>

            <button
              type="button"
              onClick={logout}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // UNAUTHENTICATED USER
  // ========================================

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search +
            location.hash,
        }}
      />
    );
  }

  // ========================================
  // AUTHENTICATED USER
  // ========================================

  return <Outlet />;
}
