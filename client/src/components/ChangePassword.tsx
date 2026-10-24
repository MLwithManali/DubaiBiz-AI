
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

// ==========================================
// CHANGE PASSWORD COMPONENT
// ==========================================

export default function ChangePassword() {
  const { token } = useAuth();

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // VALIDATION
  // ========================================

  function validateNewPassword(
    password: string
  ): string | null {
    if (
      password.length < 12 ||
      password.length > 128
    ) {
      return "Password must contain 12–128 characters.";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain an uppercase letter.";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain a lowercase letter.";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain a number.";
    }

    if (!/[^A-Za-z0-9\s]/.test(password)) {
      return "Password must contain a special character.";
    }

    if (/\s/.test(password)) {
      return "Password must not contain spaces.";
    }

    return null;
  }

  // ========================================
  // SUBMIT
  // ========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError("Please complete all password fields.");
      return;
    }

    const passwordError =
      validateNewPassword(newPassword);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        "New password must be different from your current password."
      );
      return;
    }

    if (!token) {
      setError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/change-password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        result.success !== true
      ) {
        throw new Error(
          result.message ||
          "Unable to change password."
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess(
        "Password changed successfully. Use your new password the next time you log in."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // COMPONENT UI
  // ========================================

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Account Security
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Update your password to keep your account secure.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-lg space-y-5"
      >
        {/* CURRENT PASSWORD */}
        <div>
          <label
            htmlFor="current-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Current Password
          </label>

          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) =>
              setCurrentPassword(event.target.value)
            }
            autoComplete="current-password"
            required
            maxLength={128}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* NEW PASSWORD */}
        <div>
          <label
            htmlFor="new-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            New Password
          </label>

          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(event.target.value)
            }
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* CONFIRM PASSWORD */}
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Confirm New Password
          </label>

          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* PASSWORD REQUIREMENTS */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Password Requirements
          </p>

          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>12–128 characters</li>
            <li>At least one uppercase letter</li>
            <li>At least one lowercase letter</li>
            <li>At least one number</li>
            <li>At least one special character</li>
            <li>No spaces</li>
          </ul>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Updating Password..."
            : "Change Password"}
        </button>
      </form>
    </section>
  );
}
