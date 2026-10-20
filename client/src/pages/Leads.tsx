
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import PhoneInput, {
  isValidPhoneNumber,
  type Value,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { useAuth } from "../context/AuthContext";
import { validateEmail } from "../utils/emailValidation";

// ==========================================
// API CONFIGURATION
// ==========================================

const API_URL = "http://localhost:5000/api/leads";
const AI_API_URL = "http://localhost:5000/api/ai/classify-lead";

// ==========================================
// TYPES
// ==========================================

type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Won"
  | "Lost";

type LeadPriority = "Low" | "Medium" | "High";

interface Lead {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadForm {
  name: string;
  email: string;
  company: string;
  phone: Value | undefined;
  status: LeadStatus;
  priority: LeadPriority;
  source: string;
  notes: string;
}

interface AIPrediction {
  score: number;
  priority: LeadPriority;
  explanation: string;
  model_type: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

type FormErrors = Partial<Record<keyof LeadForm, string>>;

// ==========================================
// CONSTANTS
// ==========================================

const statuses: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Won",
  "Lost",
];

const priorities: LeadPriority[] = ["Low", "Medium", "High"];

const sources = [
  "Website",
  "LinkedIn",
  "Referral",
  "Email",
  "Social Media",
  "Other",
];

const emptyForm: LeadForm = {
  name: "",
  email: "",
  company: "",
  phone: undefined,
  status: "New",
  priority: "Medium",
  source: "",
  notes: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const buttonClass =
  "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

// ==========================================
// VALIDATION
// ==========================================

function validateForm(form: LeadForm): FormErrors {
  const errors: FormErrors = {};

  const name = form.name.trim();
  const company = form.company.trim();
  const email = form.email.trim().toLowerCase();

  if (!name) {
    errors.name = "Lead name is required.";
  } else if (name.length < 2 || name.length > 100) {
    errors.name = "Name must contain 2 to 100 characters.";
  } else if (!/^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(name)) {
    errors.name = "Enter a valid name using letters.";
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!company) {
    errors.company = "Company name is required.";
  } else if (company.length < 2 || company.length > 150) {
    errors.company = "Company must contain 2 to 150 characters.";
  }

  if (form.phone && !isValidPhoneNumber(form.phone)) {
    errors.phone = "Enter a valid international phone number.";
  }

  if (form.source.length > 100) {
    errors.source = "Source must be 100 characters or fewer.";
  }

  if (form.notes.length > 2000) {
    errors.notes = "Notes must be 2000 characters or fewer.";
  }

  return errors;
}

// ==========================================
// BADGE STYLES
// ==========================================

function statusColor(status: LeadStatus): string {
  switch (status) {
    case "New":
      return "bg-blue-100 text-blue-700";
    case "Contacted":
      return "bg-yellow-100 text-yellow-800";
    case "Qualified":
      return "bg-purple-100 text-purple-700";
    case "Won":
      return "bg-green-100 text-green-700";
    case "Lost":
      return "bg-red-100 text-red-700";
  }
}

function priorityColor(priority: LeadPriority): string {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-700";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "Low":
      return "bg-green-100 text-green-700";
  }
}

// ==========================================
// API HELPER
// ==========================================

class AuthenticationError extends Error {
  constructor() {
    super("Your session has expired. Please sign in again.");
    this.name = "AuthenticationError";
  }
}

async function requestApi<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new AuthenticationError();
  }

  let result: ApiResponse<T>;

  try {
    result = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

// ==========================================
// MAIN LEADS COMPONENT
// ==========================================

export default function Leads() {
  const { token, logout } = useAuth();

  // Lead data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search and filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Add/Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deletingLead, setDeletingLead] = useState<Lead | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  // AI Classification
  const [analyzingLead, setAnalyzingLead] = useState<Lead | null>(
    null
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrediction, setAiPrediction] =
    useState<AIPrediction | null>(null);
  const [aiError, setAiError] = useState("");

  // ==========================================
  // LOAD LEADS
  // ==========================================

  const loadLeads = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await requestApi<Lead[]>(
        API_URL,
        token
      );

      setLeads(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        logout();
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load leads."
      );
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  // ==========================================
  // FILTER LEADS
  // ==========================================

  const filteredLeads = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !keyword ||
        [
          lead.name,
          lead.email,
          lead.company,
          lead.phone ?? "",
          lead.source ?? "",
        ].some((value) =>
          value.toLowerCase().includes(keyword)
        );

      const matchesStatus =
        statusFilter === "All" ||
        lead.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        lead.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [leads, search, statusFilter, priorityFilter]);

  // ==========================================
  // DASHBOARD COUNTS
  // ==========================================

  const counts = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((lead) => lead.status === "New").length,
      qualified: leads.filter(
        (lead) => lead.status === "Qualified"
      ).length,
      won: leads.filter((lead) => lead.status === "Won").length,
    }),
    [leads]
  );

  // ==========================================
  // FORM HELPERS
  // ==========================================

  function updateForm<K extends keyof LeadForm>(
    field: K,
    value: LeadForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  }

  function openAddForm() {
    setEditingLead(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setError("");
    setShowForm(true);
  }

  function openEditForm(lead: Lead) {
    setEditingLead(lead);

    setForm({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      phone: (lead.phone || undefined) as Value | undefined,
      status: lead.status,
      priority: lead.priority,
      source: lead.source ?? "",
      notes: lead.notes ?? "",
    });

    setFormErrors({});
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingLead(null);
    setFormErrors({});
  }

  // ==========================================
  // CREATE / UPDATE LEAD
  // ==========================================

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      logout();
      return;
    }

    const errors = validateForm(form);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      company: form.company.trim(),
      phone: form.phone || null,
      status: form.status,
      priority: form.priority,
      source: form.source.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      const url = editingLead
        ? `${API_URL}/${editingLead.id}`
        : API_URL;

      await requestApi<Lead>(url, token, {
        method: editingLead ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setEditingLead(null);
      setForm({ ...emptyForm });

      setSuccess(
        editingLead
          ? "Lead updated successfully."
          : "Lead created successfully."
      );

      await loadLeads();
    } catch (err) {
      if (err instanceof AuthenticationError) {
        logout();
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save lead."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DELETE LEAD
  // ==========================================

  async function confirmDelete() {
    if (!deletingLead || !token) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await requestApi<unknown>(
        `${API_URL}/${deletingLead.id}`,
        token,
        { method: "DELETE" }
      );

      setDeletingLead(null);
      setSuccess("Lead deleted successfully.");

      await loadLeads();
    } catch (err) {
      if (err instanceof AuthenticationError) {
        logout();
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete lead."
      );
    } finally {
      setDeleting(false);
    }
  }

  // ==========================================
  // AI LEAD CLASSIFICATION
  // ==========================================

  async function analyzeLead(lead: Lead) {
    if (!token) {
      logout();
      return;
    }

    setAnalyzingLead(lead);
    setAiPrediction(null);
    setAiError("");
    setAiLoading(true);

    try {
      const result = await requestApi<AIPrediction>(
        AI_API_URL,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: lead.name,
            company: lead.company,
            status: lead.status,
            source: lead.source,
            notes: lead.notes,
          }),
        }
      );

      if (!result.data) {
        throw new Error(
          "The AI service returned no classification."
        );
      }

      setAiPrediction(result.data);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        logout();
        return;
      }

      setAiError(
        err instanceof Error
          ? err.message
          : "AI classification failed."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function closeAIAnalysis() {
    if (aiLoading) return;

    setAnalyzingLead(null);
    setAiPrediction(null);
    setAiError("");
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Leads Management
          </h1>

          <p className="mt-2 text-gray-500">
            Manage opportunities and analyze lead priority.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className={`${buttonClass} bg-blue-600 px-5 py-3 text-white hover:bg-blue-700`}
        >
          + Add Lead
        </button>
      </div>

      {/* NOTIFICATIONS */}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700"
        >
          {success}
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { title: "Total Leads", value: counts.total },
          { title: "New Leads", value: counts.new },
          { title: "Qualified Leads", value: counts.qualified },
          { title: "Won Leads", value: counts.won },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">
              {item.title}
            </p>

            <p className="mt-3 text-3xl font-bold text-gray-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* FILTERS */}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads..."
            aria-label="Search leads"
            className={`${inputClass} md:col-span-2`}
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter by status"
            className={inputClass}
          >
            <option value="All">All Statuses</option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
            aria-label="Filter by priority"
            className={inputClass}
          >
            <option value="All">All Priorities</option>

            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LEADS TABLE */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              All Leads
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Showing {filteredLeads.length} of {leads.length} leads
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadLeads()}
            disabled={loading}
            className={`${buttonClass} border border-gray-300 text-gray-700 hover:bg-gray-50`}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-gray-700">
              No leads found.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Add a lead or change your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Lead</th>
                  <th className="px-5 py-4">Company</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {lead.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {lead.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {lead.company}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {lead.phone || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(
                          lead.status
                        )}`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColor(
                          lead.priority
                        )}`}
                      >
                        {lead.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {lead.source || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void analyzeLead(lead)
                          }
                          className={`${buttonClass} border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100`}
                        >
                          ✨ Analyze Lead
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditForm(lead)}
                          className={`${buttonClass} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingLead(lead)}
                          className={`${buttonClass} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================
          ADD / EDIT MODAL
      ====================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-form-title"
            className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2
                id="lead-form-title"
                className="text-2xl font-bold text-gray-900"
              >
                {editingLead ? "Edit Lead" : "Add New Lead"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <form onSubmit={(event) => void saveLead(event)}>
              <div className="grid gap-5 md:grid-cols-2">
                {/* NAME */}

                <div>
                  <label
                    htmlFor="lead-name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Lead Name *
                  </label>

                  <input
                    id="lead-name"
                    value={form.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    maxLength={100}
                    className={inputClass}
                    required
                  />

                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="lead-email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email Address *
                  </label>

                  <input
                    id="lead-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    className={inputClass}
                    required
                  />

                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* COMPANY */}

                <div>
                  <label
                    htmlFor="lead-company"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Company *
                  </label>

                  <input
                    id="lead-company"
                    value={form.company}
                    onChange={(event) =>
                      updateForm("company", event.target.value)
                    }
                    maxLength={150}
                    className={inputClass}
                    required
                  />

                  {formErrors.company && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.company}
                    </p>
                  )}
                </div>

                {/* PHONE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Phone Number
                  </label>

                  <div className={`${inputClass} [&_input]:outline-none`}>
                    <PhoneInput
                      international
                      defaultCountry="AE"
                      value={form.phone}
                      onChange={(value) =>
                        updateForm("phone", value)
                      }
                    />
                  </div>

                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                {/* STATUS */}

                <div>
                  <label
                    htmlFor="lead-status"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Status
                  </label>

                  <select
                    id="lead-status"
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as LeadStatus
                      )
                    }
                    className={inputClass}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PRIORITY */}

                <div>
                  <label
                    htmlFor="lead-priority"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Priority
                  </label>

                  <select
                    id="lead-priority"
                    value={form.priority}
                    onChange={(event) =>
                      updateForm(
                        "priority",
                        event.target.value as LeadPriority
                      )
                    }
                    className={inputClass}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SOURCE */}

                <div className="md:col-span-2">
                  <label
                    htmlFor="lead-source"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Lead Source
                  </label>

                  <select
                    id="lead-source"
                    value={form.source}
                    onChange={(event) =>
                      updateForm("source", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select source</option>

                    {sources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                {/* NOTES */}

                <div className="md:col-span-2">
                  <label
                    htmlFor="lead-notes"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Notes
                  </label>

                  <textarea
                    id="lead-notes"
                    rows={4}
                    maxLength={2000}
                    value={form.notes}
                    onChange={(event) =>
                      updateForm("notes", event.target.value)
                    }
                    placeholder="Customer requirements, interest, pricing discussion..."
                    className={inputClass}
                  />

                  {formErrors.notes && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className={`${buttonClass} border border-gray-300 text-gray-700`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={`${buttonClass} bg-blue-600 px-6 text-white hover:bg-blue-700`}
                >
                  {saving
                    ? "Saving..."
                    : editingLead
                    ? "Update Lead"
                    : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================
          DELETE CONFIRMATION MODAL
      ====================================== */}

      {deletingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-lead-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="delete-lead-title"
              className="text-xl font-bold text-gray-900"
            >
              Delete Lead?
            </h2>

            <p className="mt-4 text-gray-600">
              Are you sure you want to delete{" "}
              <strong>{deletingLead.name}</strong>?
            </p>

            <p className="mt-2 text-sm text-red-600">
              This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingLead(null)}
                disabled={deleting}
                className={`${buttonClass} border border-gray-300`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}
              >
                {deleting ? "Deleting..." : "Delete Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          AI CLASSIFICATION MODAL
      ====================================== */}

      {analyzingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-modal-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            {/* HEADER */}

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="ai-modal-title"
                  className="text-2xl font-bold text-gray-900"
                >
                  ✨ AI Lead Analysis
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Lead scoring and priority recommendation
                </p>
              </div>

              <button
                type="button"
                onClick={closeAIAnalysis}
                disabled={aiLoading}
                aria-label="Close AI analysis"
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* LEAD DETAILS */}

            <div className="mb-6 rounded-xl bg-gray-50 p-4">
              <p className="text-lg font-bold text-gray-900">
                {analyzingLead.name}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {analyzingLead.company}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(
                    analyzingLead.status
                  )}`}
                >
                  {analyzingLead.status}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColor(
                    analyzingLead.priority
                  )}`}
                >
                  Current Priority: {analyzingLead.priority}
                </span>
              </div>
            </div>

            {/* LOADING */}

            {aiLoading && (
              <div
                role="status"
                className="py-10 text-center"
              >
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />

                <p className="mt-4 font-medium text-gray-700">
                  Analyzing lead...
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Connecting to Python FastAPI.
                </p>
              </div>
            )}

            {/* ERROR */}

            {aiError && !aiLoading && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <p className="font-semibold text-red-700">
                  Analysis Failed
                </p>

                <p className="mt-2 text-sm text-red-600">
                  {aiError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void analyzeLead(analyzingLead)
                  }
                  className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* CLASSIFICATION RESULT */}

            {aiPrediction && !aiLoading && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {/* SCORE */}

                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                    <p className="text-sm font-semibold text-purple-700">
                      Lead Score
                    </p>

                    <p className="mt-3 text-3xl font-bold text-purple-900">
                      {aiPrediction.score}
                      <span className="text-lg text-purple-500">
                        /100
                      </span>
                    </p>
                  </div>

                  {/* PRIORITY */}

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-sm font-semibold text-blue-700">
                      Recommended Priority
                    </p>

                    <span
                      className={`mt-3 inline-block rounded-full px-4 py-2 text-sm font-bold ${priorityColor(
                        aiPrediction.priority
                      )}`}
                    >
                      {aiPrediction.priority}
                    </span>
                  </div>
                </div>

                {/* SCORE BAR */}

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      Classification Score
                    </span>

                    <span className="font-bold text-gray-900">
                      {aiPrediction.score}/100
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${
                        aiPrediction.priority === "High"
                          ? "bg-green-500"
                          : aiPrediction.priority === "Medium"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, aiPrediction.score)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* EXPLANATION */}

                <div className="rounded-xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900">
                    Why This Recommendation?
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {aiPrediction.explanation}
                  </p>
                </div>

                {/* MODEL INFORMATION */}

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Classification Method:{" "}
                    <span className="font-semibold text-gray-700">
                      {aiPrediction.model_type}
                    </span>
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    This is a rule-based lead scoring
                    prototype, not a trained machine learning
                    model or a conversion probability.
                  </p>

                  <p className="mt-2 text-xs font-medium text-gray-600">
                    Your saved lead priority has not changed.
                  </p>
                </div>
              </div>
            )}

            {/* FOOTER */}

            <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={closeAIAnalysis}
                disabled={aiLoading}
                className={`${buttonClass} bg-blue-600 px-6 py-3 text-white hover:bg-blue-700`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
