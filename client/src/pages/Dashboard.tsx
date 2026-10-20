
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import MetricCard from "../components/MetricCard";
import LeadPipeline from "../components/LeadPipeline";
import { useAuth } from "../context/AuthContext";

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// ==========================================
// TYPES
// ==========================================

interface Customer {
  id: number;
}

interface Lead {
  id: number;
  status: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface DashboardData {
  customers: Customer[];
  leads: Lead[];
}

// ==========================================
// API HELPER
// ==========================================

async function fetchResource<T>(
  endpoint: string,
  token: string,
  signal: AbortSignal
): Promise<T[]> {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal,
    }
  );

  if (response.status === 401) {
    throw new Error(
      "Your session has expired. Please log in again."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Unable to load CRM data (${response.status}).`
    );
  }

  const result =
    (await response.json()) as ApiResponse<T[]>;

  if (
    !result.success ||
    !Array.isArray(result.data)
  ) {
    throw new Error(
      "Invalid response received from the server."
    );
  }

  return result.data;
}

// ==========================================
// DASHBOARD COMPONENT
// ==========================================

export default function Dashboard() {
  const { token } = useAuth();

  const [data, setData] = useState<DashboardData>({
    customers: [],
    leads: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  // ========================================
  // LOAD USER-SPECIFIC CRM DATA
  // ========================================

  useEffect(() => {
    if (!token) {
      setData({ customers: [], leads: [] });
      setError("Please log in to view your dashboard.");
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(null);
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setError(null);
        setRefreshing(true);

        const [customers, leads] =
          await Promise.all([
            fetchResource<Customer>(
              "/api/customers",
              token!,
              controller.signal
            ),
            fetchResource<Lead>(
              "/api/leads",
              token!,
              controller.signal
            ),
          ]);

        if (controller.signal.aborted) return;

        setData({ customers, leads });
        setLastUpdated(new Date());
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [token, refreshKey]);

  // ========================================
  // CALCULATE DASHBOARD METRICS
  // ========================================

  const stats = useMemo(() => {
    const totalCustomers = data.customers.length;
    const totalLeads = data.leads.length;

    let qualifiedLeads = 0;
    let wonLeads = 0;

    for (const lead of data.leads) {
      if (lead.status === "Qualified") {
        qualifiedLeads += 1;
      }

      if (lead.status === "Won") {
        wonLeads += 1;
      }
    }

    const conversionRate =
      totalLeads === 0
        ? 0
        : (wonLeads / totalLeads) * 100;

    return {
      totalCustomers,
      totalLeads,
      qualifiedLeads,
      wonLeads,
      conversionRate,
    };
  }, [data]);

  const metrics = [
    {
      label: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      change: "Current CRM records",
    },
    {
      label: "Total Leads",
      value: stats.totalLeads.toLocaleString(),
      change: "Current CRM records",
    },
    {
      label: "Qualified Leads",
      value: stats.qualifiedLeads.toLocaleString(),
      change: "Current pipeline",
    },
    {
      label: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      change: `${stats.wonLeads} won leads`,
    },
  ];

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-8">
      {/* PAGE HEADING */}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Business Overview
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor your customers, leads, and CRM performance.
          </p>

          {lastUpdated && !error && (
            <p className="mt-2 text-xs text-slate-400">
              Last updated:{" "}
              {lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setRefreshKey((previous) => previous + 1)
          }
          disabled={loading || refreshing || !token}
          aria-label="Refresh dashboard data"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            aria-hidden="true"
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
            aria-hidden="true"
          />

          <div>
            <p className="font-semibold">
              Dashboard data unavailable
            </p>

            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* INITIAL LOADING */}

      {loading ? (
        <div
          role="status"
          aria-label="Loading dashboard"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
          <span className="sr-only">
            Loading dashboard data...
          </span>
        </div>
      ) : (
        !error && (
          <>
            {/* METRICS */}

            <section
              aria-label="CRM performance metrics"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
            >
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  {...metric}
                />
              ))}
            </section>

            {/* REUSABLE PIPELINE */}

            <LeadPipeline leads={data.leads} />
          </>
        )
      )}

      {/* ASSISTANT */}

      <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-50 p-3">
              <Bot
                size={22}
                className="text-violet-600"
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                DubaiBiz AI Assistant
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Ask questions about your customers,
                leads, priorities, conversion rates,
                and business performance.
              </p>
            </div>
          </div>

          <Link
            to="/assistant"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            Open AI Assistant
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
