
import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
  type AuthUser,
} from "../context/AuthContext";

// ============================================
// API CONFIGURATION
// ============================================

const LOGIN_API_URL =
  "http://localhost:5000/api/auth/login";

// ============================================
// TYPES
// ============================================

interface LoginResponse {
  success: boolean;
  message?: string;
  requiresVerification?: boolean;
  data?: {
    token: string;
    user: AuthUser;
  };
}

// ============================================
// LOGIN COMPONENT
// ============================================

export default function Login() {
  const { user, token, login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // ------------------------------------------
  // FORM STATES
  // ------------------------------------------

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [requiresVerification, setRequiresVerification] =
    useState(false);

  // ==========================================
  // NORMALIZE EMAIL
  // ==========================================

  const normalizedEmail =
    email.trim().toLowerCase();

  // ==========================================
  // NAVIGATE TO EMAIL VERIFICATION
  // ==========================================

  function goToVerification() {
    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    navigate(
      `/verify-email?email=${encodeURIComponent(
        normalizedEmail
      )}`
    );
  }

  // ==========================================
  // LOGIN SUBMISSION
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setRequiresVerification(false);

    // ----------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------

    if (!normalizedEmail || !password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        LOGIN_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        }
      );

      // --------------------------------------
      // PARSE RESPONSE
      // --------------------------------------

      let result: LoginResponse;

      try {
        result =
          (await response.json()) as LoginResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      // --------------------------------------
      // EMAIL NOT VERIFIED
      // --------------------------------------

      if (
        response.status === 403 &&
        result.requiresVerification === true
      ) {
        setRequiresVerification(true);

        setError(
          result.message ||
            "Your email address is not verified. Please verify your email before signing in."
        );

        return;
      }

      // --------------------------------------
      // LOGIN FAILED
      // --------------------------------------

      if (
        !response.ok ||
        !result.success ||
        !result.data?.token ||
        !result.data?.user
      ) {
        throw new Error(
          result.message || "Login failed."
        );
      }

      // --------------------------------------
      // LOGIN SUCCESSFUL
      // --------------------------------------

      login(
        result.data.user,
        result.data.token
      );

      // Redirect to the originally requested
      // protected page, or to the Dashboard.

      const destination =
        (
          location.state as {
            from?: string;
          } | null
        )?.from || "/";

      navigate(destination, {
        replace: true,
      });
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please make sure the server is running."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to log in."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // REDIRECT AUTHENTICATED USERS
  // ==========================================

  if (user && token) {
    return <Navigate to="/" replace />;
  }

  // ==========================================
  // LOGIN UI
  // ==========================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">

        {/* HEADER */}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            D
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to DubaiBiz AI
          </p>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <p>{error}</p>

            {requiresVerification && (
              <button
                type="button"
                onClick={goToVerification}
                className="mt-3 font-semibold text-blue-700 underline hover:text-blue-900"
              >
                Verify Email Now
              </button>
            )}
          </div>
        )}

        {/* LOGIN FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* EMAIL ADDRESS */}

          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email Address
            </label>

            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setRequiresVerification(false);
              }}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* PASSWORD */}

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="login-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
                setRequiresVerification(false);
              }}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {/* SHOW PASSWORD */}

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) =>
                  setShowPassword(
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />

              Show password
            </label>
          </div>

          {/* SIGN IN BUTTON */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        {/* REGISTRATION LINK */}

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-blue-600 hover:underline"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
