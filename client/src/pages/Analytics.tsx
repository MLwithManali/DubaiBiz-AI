
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

// ==========================================
// API CONFIGURATION
// ==========================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  status: LeadStatus;
  priority: LeadPriority;
  source: string | null;
  createdAt: string;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Won",
  "Lost",
];

const PRIORITIES: LeadPriority[] = [
  "Low",
  "Medium",
  "High",
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "bg-blue-500",
  Contacted: "bg-amber-500",
  Qualified: "bg-purple-500",
  Won: "bg-green-500",
  Lost: "bg-red-500",
};

const PRIORITY_COLORS: Record<LeadPriority, string> = {
  Low: "bg-gray-400",
  Medium: "bg-orange-500",
  High: "bg-red-500",
};

// ==========================================
// AUTHENTICATED API REQUEST
// ==========================================

async function fetchProtectedData<T>(
  endpoint: string,
  token: string
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.status === 401) {
    throw new Error("SESSION_EXPIRED");
  }

  const result =
    (await response.json()) as ApiResponse<T>;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(
      result.message || "Unable to load analytics data."
    );
  }

  return result.data;
}

// ==========================================
// STATISTIC CARD
// ==========================================

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
}

function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <h3 className="mt-3 text-3xl font-bold text-gray-900">
        {value}
      </h3>

      <p className="mt-2 text-xs text-gray-400">
        {description}
      </p>
    </div>
  );
}

// ==========================================
// DISTRIBUTION BAR
// ==========================================

interface DistributionBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function DistributionBar({
  label,
  count,
  total,
  color,
}: DistributionBarProps) {
  const percentage =
    total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          {label}
        </span>

        <span className="text-gray-500">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ==========================================
// ANALYTICS PAGE
// ==========================================

export default function Analytics() {
  const { token, logout } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // LOAD DATA FROM POSTGRESQL
  // ========================================

  const loadAnalytics = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [customerData, leadData] = await Promise.all([
        fetchProtectedData<Customer[]>(
          "/api/customers",
          token
        ),
        fetchProtectedData<Lead[]>(
          "/api/leads",
          token
        ),
      ]);

      setCustomers(customerData);
      setLeads(leadData);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "SESSION_EXPIRED"
      ) {
        logout();
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, refreshKey]);

  // ========================================
  // CALCULATE ANALYTICS
  // ========================================

  const analytics = useMemo(() => {
    const totalLeads = leads.length;

    const statusCounts = Object.fromEntries(
      STATUSES.map((status) => [
        status,
        leads.filter((lead) => lead.status === status).length,
      ])
    ) as Record<LeadStatus, number>;

    const priorityCounts = Object.fromEntries(
      PRIORITIES.map((priority) => [
        priority,
        leads.filter((lead) => lead.priority === priority).length,
      ])
    ) as Record<LeadPriority, number>;

    const conversionRate =
      totalLeads > 0
        ? (statusCounts.Won / totalLeads) * 100
        : 0;

    const recentLeads = [...leads]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    return {
      totalCustomers: customers.length,
      totalLeads,
      statusCounts,
      priorityCounts,
      conversionRate,
      recentLeads,
    };
  }, [customers, leads]);

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Business Analytics
            </h1>

            <p className="mt-2 text-gray-500">
              Real-time overview of your CRM performance
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="mt-3 text-sm font-semibold underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            Loading business analytics...
          </div>
        ) : (
          <>
            {/* STATISTICS */}

            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Total Customers"
                value={analytics.totalCustomers}
                description="Customers stored in PostgreSQL"
              />

              <StatCard
                title="Total Leads"
                value={analytics.totalLeads}
                description="All business opportunities"
              />

              <StatCard
                title="New Leads"
                value={analytics.statusCounts.New}
                description="Leads awaiting initial contact"
              />

              <StatCard
                title="Qualified Leads"
                value={analytics.statusCounts.Qualified}
                description="Potential sales opportunities"
              />

              <StatCard
                title="Won Leads"
                value={analytics.statusCounts.Won}
                description="Successfully converted leads"
              />

              <StatCard
                title="Lead Conversion Rate"
                value={`${analytics.conversionRate.toFixed(1)}%`}
                description="Won leads divided by total leads"
              />
            </div>

            {/* DISTRIBUTION */}

            <div className="mb-8 grid gap-6 lg:grid-cols-2">

              {/* STATUS DISTRIBUTION */}

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold text-gray-900">
                  Leads by Status
                </h2>

                <div className="space-y-5">
                  {STATUSES.map((status) => (
                    <DistributionBar
                      key={status}
                      label={status}
                      count={analytics.statusCounts[status]}
                      total={analytics.totalLeads}
                      color={STATUS_COLORS[status]}
                    />
                  ))}
                </div>
              </div>

              {/* PRIORITY DISTRIBUTION */}

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold text-gray-900">
                  Leads by Priority
                </h2>

                <div className="space-y-5">
                  {PRIORITIES.map((priority) => (
                    <DistributionBar
                      key={priority}
                      label={priority}
                      count={analytics.priorityCounts[priority]}
                      total={analytics.totalLeads}
                      color={PRIORITY_COLORS[priority]}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RECENT LEADS */}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Leads
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead className="bg-gray-50 text-sm text-gray-600">
                    <tr>
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Company</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Priority</th>
                      <th className="px-5 py-4">Created</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {analytics.recentLeads.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-gray-500"
                        >
                          No leads available yet.
                          Add a lead to see analytics.
                        </td>
                      </tr>
                    ) : (
                      analytics.recentLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-5 py-4 font-semibold text-gray-900">
                            {lead.name}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {lead.company}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {lead.status}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {lead.priority}
                          </td>

                          <td className="px-5 py-4 text-gray-500">
                            {new Date(
                              lead.createdAt
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
