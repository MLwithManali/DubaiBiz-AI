
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import PhoneInput, {
  isValidPhoneNumber,
  parsePhoneNumber,
  type Value,
} from "react-phone-number-input";

import "react-phone-number-input/style.css";

import { useAuth } from "../context/AuthContext";
import { validateEmail } from "../utils/emailValidation";

const API_URL = "http://localhost:5000/api/customers";

interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string;
}

interface CustomerForm {
  name: string;
  email: string;
  company: string;
  phone: Value | undefined;
}

type FieldName = keyof CustomerForm;
type FormErrors = Partial<Record<FieldName, string>>;

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  company: "",
  phone: undefined,
};

const inputBase =
  "w-full rounded-lg border bg-white px-4 py-3 text-gray-900 outline-none transition focus:ring-2";

function inputClass(error?: string) {
  return `${inputBase} ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
  }`;
}

// ---------------------------------------------
// FORM VALIDATION
// ---------------------------------------------

function validateForm(form: CustomerForm): FormErrors {
  const errors: FormErrors = {};

  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const company = form.company.trim();
  const phone = form.phone;

  // Customer name
  if (!name) {
    errors.name = "Customer name is required.";
  } else if (name.length < 2 || name.length > 100) {
    errors.name = "Name must contain 2 to 100 characters.";
  } else if (!/^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(name)) {
    errors.name =
      "Name must contain letters only. Numbers are not allowed.";
  }

  // Email
  const emailError = validateEmail(email);

  if (emailError) {
    errors.email = emailError;
  }

  // Company
  if (!company) {
    errors.company = "Company name is required.";
  } else if (company.length < 2 || company.length > 150) {
    errors.company =
      "Company name must contain 2 to 150 characters.";
  }

  // WhatsApp number
  if (!phone) {
    errors.phone = "WhatsApp number is required.";
  } else if (phone.length > 30 || !isValidPhoneNumber(phone)) {
    errors.phone =
      "Enter a valid international mobile number for the selected country.";
  } else {
    const parsed = parsePhoneNumber(phone);

    if (
      parsed?.country === "IN" &&
      !/^[6-9]\d{9}$/.test(parsed.nationalNumber)
    ) {
      errors.phone =
        "Indian mobile numbers must have 10 digits and start with 6, 7, 8 or 9.";
    }
  }

  return errors;
}

// ---------------------------------------------
// AUTHENTICATED API HELPER
// ---------------------------------------------

async function requestApi<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  let response: Response;

  try {
    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${token}`);

    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure the server is running on http://localhost:5000."
    );
  }

  let result: ApiResponse<T>;

  try {
    result = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("The backend returned an invalid response.");
  }

  if (response.status === 401) {
    throw new Error(
      "Your login session has expired. Please log in again."
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

// ---------------------------------------------
// CUSTOMERS PAGE
// ---------------------------------------------

export default function Customers() {
  // JWT Authentication
  const { token, logout } = useAuth();

  // Customer records
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState<CustomerForm>({
    ...emptyForm,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Delete confirmation
  const [deletingCustomer, setDeletingCustomer] =
    useState<Customer | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notifications
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");

  // -------------------------------------------
  // LOAD CUSTOMERS WITH JWT
  // -------------------------------------------

  const loadCustomers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPageError("");

      const result = await requestApi<Customer[]>(
        API_URL,
        token
      );

      setCustomers(result.data || []);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to load customers.";

      if (errorMessage.includes("session has expired")) {
        logout();
        return;
      }

      setPageError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  // -------------------------------------------
  // SEARCH CUSTOMERS
  // -------------------------------------------

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.name,
        customer.email,
        customer.company,
        customer.phone,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [customers, search]);

  // -------------------------------------------
  // OPEN ADD CUSTOMER FORM
  // -------------------------------------------

  function openAddForm() {
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormError("");
    setEditingId(null);
    setShowForm(true);
    setMessage("");
  }

  // -------------------------------------------
  // OPEN EDIT CUSTOMER FORM
  // -------------------------------------------

  function openEditForm(customer: Customer) {
    setForm({
      name: customer.name,
      email: customer.email,
      company: customer.company,
      phone: customer.phone as Value,
    });

    setFormErrors({});
    setFormError("");
    setEditingId(customer.id);
    setShowForm(true);
    setMessage("");
  }

  // -------------------------------------------
  // CLOSE CUSTOMER FORM
  // -------------------------------------------

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormError("");
  }

  // -------------------------------------------
  // UPDATE FORM FIELDS
  // -------------------------------------------

  function updateField(
    field: "name" | "email" | "company",
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setFormError("");
  }

  function updatePhone(value: Value | undefined) {
    setForm((previous) => ({
      ...previous,
      phone: value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      phone: undefined,
    }));

    setFormError("");
  }

  // -------------------------------------------
  // ADD / EDIT CUSTOMER WITH JWT
  // -------------------------------------------

  async function saveCustomer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");

    const errors = validateForm(form);

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError(
        "Please correct the highlighted fields before saving."
      );
      return;
    }

    if (!token) {
      logout();
      setFormError("Please log in again.");
      return;
    }

    const isEditing = editingId !== null;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      company: form.company.trim(),
      phone: form.phone,
    };

    try {
      setSaving(true);

      const result = await requestApi<Customer>(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        token,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!result.data) {
        throw new Error("Customer data was not returned.");
      }

      const savedCustomer = result.data;

      setCustomers((previous) =>
        isEditing
          ? previous.map((customer) =>
              customer.id === savedCustomer.id
                ? savedCustomer
                : customer
            )
          : [...previous, savedCustomer]
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setFormErrors({});
      setFormError("");
      setPageError("");

      setMessage(
        isEditing
          ? "Customer updated successfully!"
          : "Customer added successfully!"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to save customer.";

      if (errorMessage.includes("session has expired")) {
        logout();
        return;
      }

      setFormError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------
  // DELETE CUSTOMER WITH JWT
  // -------------------------------------------

  async function confirmDelete() {
    if (!deletingCustomer) return;

    if (!token) {
      logout();
      return;
    }

    try {
      setDeleting(true);
      setPageError("");
      setMessage("");

      await requestApi<unknown>(
        `${API_URL}/${deletingCustomer.id}`,
        token,
        {
          method: "DELETE",
        }
      );

      setCustomers((previous) =>
        previous.filter(
          (customer) => customer.id !== deletingCustomer.id
        )
      );

      setDeletingCustomer(null);
      setMessage("Customer deleted successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to delete customer.";

      if (errorMessage.includes("session has expired")) {
        logout();
        return;
      }

      setPageError(errorMessage);
      setDeletingCustomer(null);
    } finally {
      setDeleting(false);
    }
  }

  // -------------------------------------------
  // CUSTOMER DIRECTORY UI
  // -------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Directory
            </h1>

            <p className="mt-2 text-gray-500">
              Manage your business customers
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add Customer
          </button>
        </div>

        {/* SUCCESS MESSAGE */}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700"
          >
            {message}
          </div>
        )}

        {/* PAGE ERROR */}

        {pageError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700"
          >
            <p>{pageError}</p>

            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold hover:bg-red-100"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* SEARCH */}

        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, company or phone..."
            aria-label="Search customers"
            className={`${inputClass()} md:max-w-lg`}
          />

          <p className="text-sm font-medium text-gray-600">
            Showing {filteredCustomers.length} of{" "}
            {customers.length} customers
          </p>
        </div>

        {/* CUSTOMERS TABLE */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-gray-50">
                <tr className="text-sm text-gray-600">
                  <th className="px-5 py-4 font-semibold">
                    Name
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Email
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Company
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    WhatsApp Number
                  </th>

                  <th className="px-5 py-4 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      Loading customers...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      {search
                        ? "No customers match your search."
                        : "No customers yet. Add your first customer!"}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {customer.name}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {customer.email}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {customer.company}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {customer.phone}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(customer)}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeletingCustomer(customer);
                              setMessage("");
                              setPageError("");
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADD / EDIT CUSTOMER MODAL */}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-form-title"
              className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2
                  id="customer-form-title"
                  className="text-2xl font-bold text-gray-900"
                >
                  {editingId !== null
                    ? "Edit Customer"
                    : "Add New Customer"}
                </h2>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  aria-label="Close customer form"
                  className="text-2xl text-gray-400 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {formError}
                </div>
              )}

              <form
                onSubmit={saveCustomer}
                noValidate
                className="space-y-5"
              >
                {/* CUSTOMER NAME */}

                <div>
                  <label
                    htmlFor="customer-name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Customer Name *
                  </label>

                  <input
                    id="customer-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="Enter customer name"
                    maxLength={100}
                    aria-invalid={!!formErrors.name}
                    className={inputClass(formErrors.name)}
                  />

                  {formErrors.name && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-red-600"
                    >
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="customer-email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email Address *
                  </label>

                  <input
                    id="customer-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="Enter email address"
                    maxLength={254}
                    aria-invalid={!!formErrors.email}
                    className={inputClass(formErrors.email)}
                  />

                  {formErrors.email && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-red-600"
                    >
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* COMPANY */}

                <div>
                  <label
                    htmlFor="customer-company"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Company Name *
                  </label>

                  <input
                    id="customer-company"
                    type="text"
                    value={form.company}
                    onChange={(event) =>
                      updateField("company", event.target.value)
                    }
                    placeholder="Enter company name"
                    maxLength={150}
                    aria-invalid={!!formErrors.company}
                    className={inputClass(formErrors.company)}
                  />

                  {formErrors.company && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-red-600"
                    >
                      {formErrors.company}
                    </p>
                  )}
                </div>

                {/* WHATSAPP NUMBER */}

                <div>
                  <label
                    htmlFor="customer-phone"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    WhatsApp Number *
                  </label>

                  <div
                    className={`${inputClass(
                      formErrors.phone
                    )} flex items-center`}
                  >
                    <PhoneInput
                      id="customer-phone"
                      international
                      defaultCountry="AE"
                      countryCallingCodeEditable={false}
                      value={form.phone}
                      onChange={updatePhone}
                      placeholder="Enter WhatsApp number"
                      className="w-full"
                    />
                  </div>

                  {formErrors.phone && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-red-600"
                    >
                      {formErrors.phone}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Select the country flag and enter a valid
                    international mobile number.
                  </p>
                </div>

                {/* FORM BUTTONS */}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                      ? "Update Customer"
                      : "Save Customer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}

        {deletingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-customer-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2
                id="delete-customer-title"
                className="text-xl font-bold text-gray-900"
              >
                Delete Customer?
              </h2>

              <p className="mt-4 text-gray-600">
                Are you sure you want to delete{" "}
                <strong>{deletingCustomer.name}</strong>?
              </p>

              <p className="mt-2 text-sm text-red-600">
                This permanently removes the customer from
                PostgreSQL.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  disabled={deleting}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void confirmDelete()}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Customer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
