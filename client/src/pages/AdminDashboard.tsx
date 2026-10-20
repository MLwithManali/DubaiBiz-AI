
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Contact,
  Target,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

interface AdminStats {
  totalUsers: number;
  totalCustomers: number;
  totalLeads: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  adminUsers: number;
  conversionRate: number;
  leadStatuses: Record<string, number>;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  _count: {
    customers: number;
    leads: number;
  };
}

interface UsersData {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function getAdminData<T>(
  path: string,
  token: string,
  signal: AbortSignal
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal,
  });

  const result =
    (await response.json()) as ApiResponse<T>;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(
      result.message ||
        `Unable to load admin data (${response.status}).`
    );
  }

  return result.data;
}

export default function AdminDashboard() {
  const { token } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      if (!token) {
        setStats(null);
        setUsersData(null);
        setError("Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const [statsResult, usersResult] = await Promise.all([
          getAdminData<AdminStats>(
            "/api/admin/stats",
            token,
            controller.signal
          ),
          getAdminData<UsersData>(
            `/api/admin/users?page=${page}&limit=10`,
            token,
            controller.signal
          ),
        ]);

        if (controller.signal.aborted) return;

        setStats(statsResult);
        setUsersData(usersResult);
      } catch (err) {
        if (controller.signal.aborted) return;

        setStats(null);
        setUsersData(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load administrator data."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [token, page, refreshKey]);

  const metrics = stats
    ? [
        {
          label: "Total Users",
          value: stats.totalUsers,
          icon: Users,
        },
        {
          label: "Verified Users",
          value: stats.verifiedUsers,
          icon: UserCheck,
        },
        {
          label: "Total Customers",
          value: stats.totalCustomers,
          icon: Contact,
        },
        {
          label: "Total Leads",
          value: stats.totalLeads,
          icon: Target,
        },
      ]
    : [];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={25} />
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Platform statistics and registered user accounts.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => setRefreshKey((value) => value + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading ? (
        <div
          role="status"
          className="rounded-xl bg-white p-8 text-center text-slate-500"
        >
          Loading administrator data...
        </div>
      ) : (
        <>
          {stats && (
            <>
              <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        {label}
                      </p>
                      <Icon size={21} className="text-blue-600" />
                    </div>
                    <p className="mt-5 text-3xl font-bold text-slate-900">
                      {value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </section>

              <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Account Overview
                  </h2>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Administrators</span>
                      <strong>{stats.adminUsers}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Unverified accounts</span>
                      <strong>{stats.unverifiedUsers}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Lead conversion rate</span>
                      <strong>{stats.conversionRate.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Platform Lead Pipeline
                  </h2>
                  <div className="mt-5 space-y-3 text-sm">
                    {Object.entries(stats.leadStatuses).map(
                      ([status, count]) => (
                        <div
                          key={status}
                          className="flex justify-between"
                        >
                          <span>{status}</span>
                          <strong>{count}</strong>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {usersData && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  User Management
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {usersData.pagination.total} registered accounts
                </p>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {[
                        "User",
                        "Role",
                        "Verification",
                        "Customers",
                        "Leads",
                        "Joined",
                      ].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-5 py-4 font-semibold"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {usersData.users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.email}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={
                              user.emailVerified
                                ? "text-green-700"
                                : "text-amber-700"
                            }
                          >
                            {user.emailVerified
                              ? "Verified"
                              : "Unverified"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {user._count.customers}
                        </td>
                        <td className="px-5 py-4">
                          {user._count.leads}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}

                    {usersData.users.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          No registered users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
                <p className="text-sm text-slate-500">
                  Page {usersData.pagination.page} of{" "}
                  {Math.max(1, usersData.pagination.totalPages)}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={
                      page >= usersData.pagination.totalPages
                    }
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
