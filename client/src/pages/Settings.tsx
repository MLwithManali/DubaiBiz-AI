
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useAuth } from "../context/AuthContext";
import ChangePassword from "../components/ChangePassword";

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

// ==========================================
// SETTINGS PAGE
// ==========================================

export default function Settings() {
  const { user, token, refreshUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // SYNC PROFILE
  // ========================================

  useEffect(() => {
    if (!editing) {
      setName(user?.name ?? "");
    }
  }, [user?.name, editing]);

  // ========================================
  // EDIT PROFILE
  // ========================================

  function handleEdit(): void {
    setName(user?.name ?? "");
    setError("");
    setSuccess("");
    setEditing(true);
  }

  // ========================================
  // CANCEL
  // ========================================

  function handleCancel(): void {
    setName(user?.name ?? "");
    setEditing(false);
    setError("");
    setSuccess("");
  }

  // ========================================
  // SAVE PROFILE
  // ========================================

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const cleanName = name.trim();

    setError("");
    setSuccess("");

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      !/^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(cleanName)
    ) {
      setError(
        "Full name must contain 2–100 characters and letters only."
      );
      return;
    }

    if (!token) {
      setError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    if (cleanName === user?.name) {
      setEditing(false);
      setSuccess("No changes were needed.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
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
          "Unable to update your profile."
        );
      }

      await refreshUser();

      setEditing(false);
      setSuccess(
        "Your profile has been updated successfully."
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
  // PAGE
  // ========================================

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Account Settings
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Manage your DubaiBiz AI account and security.
        </p>
      </div>

      {/* PROFILE CARD */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              My Profile
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View and update your account information.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={handleEdit}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="grid gap-5 md:grid-cols-2">
            {/* FULL NAME */}
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full Name
              </label>

              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                readOnly={!editing}
                maxLength={100}
                autoComplete="name"
                className={`w-full rounded-xl border px-4 py-3 text-slate-700 transition ${
                  editing
                    ? "border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    : "border-slate-200 bg-slate-50"
                }`}
              />
            </div>

            {/* EMAIL */}
            <div>
              <label
                htmlFor="profile-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>

              <input
                id="profile-email"
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              />
            </div>

            {/* ROLE */}
            <div>
              <label
                htmlFor="profile-role"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Account Role
              </label>

              <input
                id="profile-role"
                type="text"
                value={user?.role ?? ""}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              />
            </div>

            {/* STATUS */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Account Status
              </label>

              <div className="flex min-h-12 items-center rounded-xl border border-green-200 bg-green-50 px-4 text-sm font-medium text-green-700">
                Active Account
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          {editing && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </section>

      {/* CHANGE PASSWORD */}
      <ChangePassword />
    </div>
  );
}
