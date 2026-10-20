
import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { validateEmail } from "../utils/emailValidation";
import {
  validatePassword,
  passwordsMatch,
} from "../utils/passwordValidation";

// ============================================
// API CONFIGURATION
// ============================================

const API_URL = "http://localhost:5000/api/auth/register";

// ============================================
// TYPES
// ============================================

interface RegisterResponse {
  success: boolean;
  message?: string;
}

interface PasswordRule {
  label: string;
  valid: boolean;
}

// ============================================
// PASSWORD STRENGTH
// ============================================

function getPasswordStrength(
  passedRules: number
): {
  label: string;
  color: string;
  width: string;
} {
  if (passedRules <= 2) {
    return {
      label: "Weak",
      color: "bg-red-500",
      width: "w-1/4",
    };
  }

  if (passedRules <= 4) {
    return {
      label: "Fair",
      color: "bg-orange-500",
      width: "w-2/4",
    };
  }

  if (passedRules <= 5) {
    return {
      label: "Good",
      color: "bg-yellow-500",
      width: "w-3/4",
    };
  }

  return {
    label: "Meets requirements",
    color: "bg-green-500",
    width: "w-full",
  };
}

// ============================================
// MAIN REGISTER COMPONENT
// ============================================

export default function Register() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // ------------------------------------------
  // FORM FIELDS
  // ------------------------------------------

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  // ------------------------------------------
  // UI STATES
  // ------------------------------------------

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [accountMayExist, setAccountMayExist] =
    useState(false);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // ==========================================
  // VALIDATION
  // ==========================================

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const nameValid =
    normalizedName.length >= 2 &&
    normalizedName.length <= 100 &&
    /^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(
      normalizedName
    );

  const emailError = normalizedEmail
    ? validateEmail(normalizedEmail)
    : "Email address is required.";

  const emailValid = !emailError;

  const passwordRules =
    validatePassword(password);

  const isPasswordMatching =
    passwordsMatch(
      password,
      confirmPassword
    );

  const rules: PasswordRule[] = [
    {
      label: "At least 12 characters",
      valid: passwordRules.minLength,
    },
    {
      label: "Maximum 128 characters",
      valid: passwordRules.maxLength,
    },
    {
      label: "At least one uppercase letter (A-Z)",
      valid: passwordRules.uppercase,
    },
    {
      label: "At least one lowercase letter (a-z)",
      valid: passwordRules.lowercase,
    },
    {
      label: "At least one number (0-9)",
      valid: passwordRules.number,
    },
    {
      label: "At least one special character (!@#$...)",
      valid: passwordRules.specialCharacter,
    },
    {
      label: "No spaces",
      valid: passwordRules.noSpaces,
    },
  ];

  const passedRules = rules.filter(
    (rule) => rule.valid
  ).length;

  const strength = getPasswordStrength(
    passedRules
  );

  const formValid =
    nameValid &&
    emailValid &&
    passwordRules.valid &&
    isPasswordMatching;

  // ==========================================
  // NAVIGATE TO EMAIL VERIFICATION
  // ==========================================

  function goToVerification() {
    navigate(
      `/verify-email?email=${encodeURIComponent(
        normalizedEmail
      )}`,
      {
        replace: true,
      }
    );
  }

  // ==========================================
  // FORM SUBMISSION
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setAccountMayExist(false);

    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!nameValid) {
      setError(
        "Please enter a valid full name containing 2 to 100 characters."
      );
      return;
    }

    if (!emailValid) {
      setError(
        emailError ||
          "Please enter a valid email address."
      );
      return;
    }

    if (!passwordRules.valid) {
      setError(
        "Your password does not meet all security requirements."
      );
      return;
    }

    if (!isPasswordMatching) {
      setError(
        "Password and confirm password do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password,
        }),
      });

      let result: RegisterResponse;

      try {
        result =
          (await response.json()) as RegisterResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      // ---------------------------------------
      // SUCCESS: ACCOUNT CREATED
      // ---------------------------------------

      if (response.ok && result.success) {
        goToVerification();
        return;
      }

      const message =
        result.message ||
        "Unable to create account.";

      // ---------------------------------------
      // ACCOUNT CREATED, EMAIL DELIVERY FAILED
      // ---------------------------------------

      if (
        response.status === 503 &&
        message
          .toLowerCase()
          .includes("verification email")
      ) {
        goToVerification();
        return;
      }

      // ---------------------------------------
      // EXISTING ACCOUNT
      // ---------------------------------------

      if (response.status === 409) {
        setAccountMayExist(true);
        setError(
          "This email address may already be registered. If you have an account, sign in. If your email is not verified, continue to email verification."
        );
        return;
      }

      // ---------------------------------------
      // OTHER BACKEND ERRORS
      // ---------------------------------------

      setError(message);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please make sure the server is running."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to create account."
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
  // REGISTRATION UI
  // ==========================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">

        {/* HEADER */}

        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            D
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Get started with DubaiBiz AI
          </p>
        </div>

        {/* GENERAL ERROR */}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <p>{error}</p>

            {accountMayExist && emailValid && (
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="font-semibold text-blue-700 underline"
                >
                  Sign In
                </Link>

                <button
                  type="button"
                  onClick={goToVerification}
                  className="font-semibold text-blue-700 underline"
                >
                  Verify Email
                </button>
              </div>
            )}
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
        >

          {/* FULL NAME */}

          <div>
            <label
              htmlFor="register-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full Name *
            </label>

            <input
              id="register-name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
                setAccountMayExist(false);
              }}
              onBlur={() =>
                setTouched((previous) => ({
                  ...previous,
                  name: true,
                }))
              }
              placeholder="Enter your full name"
              aria-invalid={
                touched.name && !nameValid
              }
              className={`w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 ${
                touched.name && !nameValid
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />

            {touched.name && !nameValid && (
              <p
                role="alert"
                className="mt-2 text-xs text-red-600"
              >
                Enter 2–100 characters using letters,
                spaces, hyphens or apostrophes.
              </p>
            )}

            {touched.name && nameValid && (
              <p className="mt-2 text-xs text-green-600">
                ✓ Valid full name
              </p>
            )}
          </div>

          {/* EMAIL ADDRESS */}

          <div>
            <label
              htmlFor="register-email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email Address *
            </label>

            <input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setAccountMayExist(false);
              }}
              onBlur={() =>
                setTouched((previous) => ({
                  ...previous,
                  email: true,
                }))
              }
              placeholder="you@company.com"
              aria-invalid={
                touched.email && !emailValid
              }
              className={`w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 ${
                touched.email && !emailValid
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />

            {touched.email && !emailValid && (
              <p
                role="alert"
                className="mt-2 text-xs text-red-600"
              >
                {emailError}
              </p>
            )}

            {touched.email && emailValid && (
              <p className="mt-2 text-xs text-green-600">
                ✓ Valid email format
              </p>
            )}
          </div>

          {/* PASSWORD */}

          <div>
            <label
              htmlFor="register-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password *
            </label>

            <input
              id="register-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
                setAccountMayExist(false);
              }}
              onBlur={() =>
                setTouched((previous) => ({
                  ...previous,
                  password: true,
                }))
              }
              placeholder="Create a strong password"
              aria-invalid={
                touched.password &&
                !passwordRules.valid
              }
              className={`w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 ${
                touched.password &&
                !passwordRules.valid
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />

            <p className="mt-2 text-right text-xs text-slate-400">
              {password.length}/128 characters
            </p>

            {/* PASSWORD STRENGTH */}

            {password.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">
                    Password requirements
                  </p>

                  <p className="text-xs font-semibold text-slate-700">
                    {strength.label}
                  </p>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`}
                  />
                </div>
              </div>
            )}

            {/* LIVE PASSWORD REQUIREMENTS */}

            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Password must include:
              </p>

              {rules.map((rule) => (
                <div
                  key={rule.label}
                  className="flex items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                      rule.valid
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {rule.valid ? "✓" : "○"}
                  </span>

                  <span
                    className={`text-xs ${
                      rule.valid
                        ? "text-green-700"
                        : "text-slate-600"
                    }`}
                  >
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CONFIRM PASSWORD */}

          <div>
            <label
              htmlFor="register-confirm-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm Password *
            </label>

            <input
              id="register-confirm-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              required
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(
                  event.target.value
                );
                setError("");
                setAccountMayExist(false);
              }}
              onBlur={() =>
                setTouched((previous) => ({
                  ...previous,
                  confirmPassword: true,
                }))
              }
              placeholder="Enter password again"
              aria-invalid={
                touched.confirmPassword &&
                !isPasswordMatching
              }
              className={`w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 ${
                touched.confirmPassword &&
                !isPasswordMatching
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />

            {confirmPassword.length > 0 && (
              <p
                className={`mt-2 text-xs font-medium ${
                  isPasswordMatching
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {isPasswordMatching
                  ? "✓ Passwords match"
                  : "✗ Passwords do not match"}
              </p>
            )}

            {touched.confirmPassword &&
              confirmPassword.length === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  Please confirm your password.
                </p>
              )}
          </div>

          {/* SHOW PASSWORDS */}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
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

            Show passwords
          </label>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading || !formValid}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

          {!formValid && (
            <p className="text-center text-xs text-slate-500">
              Complete all fields and password
              requirements to create your account.
            </p>
          )}
        </form>

        {/* LOGIN LINK */}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
