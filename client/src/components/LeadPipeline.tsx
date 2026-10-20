
import { useMemo } from "react";
import { ArrowRight, Target } from "lucide-react";
import { Link } from "react-router-dom";

// ==========================================
// TYPES
// ==========================================

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Won",
  "Lost",
] as const;

export type LeadStatus =
  (typeof LEAD_STATUSES)[number];

export interface PipelineLead {
  id: number;
  status: string;
}

interface LeadPipelineProps {
  leads: readonly PipelineLead[];
  isLoading?: boolean;
}

interface PipelineStage {
  name: LeadStatus;
  color: string;
  badge: string;
  count: number;
  percentage: number;
}

// ==========================================
// PIPELINE CONFIGURATION
// ==========================================

const STAGE_CONFIG = [
  {
    name: "New",
    color: "bg-sky-500",
    badge: "bg-sky-100 text-sky-700",
  },
  {
    name: "Contacted",
    color: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    name: "Qualified",
    color: "bg-violet-500",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    name: "Won",
    color: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Lost",
    color: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700",
  },
] as const;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculatePipeline(
  leads: readonly PipelineLead[]
): PipelineStage[] {
  const total = leads.length;

  const counts: Record<LeadStatus, number> = {
    New: 0,
    Contacted: 0,
    Qualified: 0,
    Won: 0,
    Lost: 0,
  };

  for (const lead of leads) {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        lead.status
      )
    ) {
      const status = lead.status as LeadStatus;
      counts[status] += 1;
    }
  }

  return STAGE_CONFIG.map((stage) => {
    const count = counts[stage.name];

    return {
      ...stage,
      count,
      percentage:
        total === 0 ? 0 : (count / total) * 100,
    };
  });
}

// ==========================================
// PIPELINE STAGE CARD
// ==========================================

function PipelineStageCard({
  stage,
}: {
  stage: PipelineStage;
}) {
  return (
    <article className="group min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {stage.name}
        </h3>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stage.badge}`}
        >
          {stage.count}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {stage.count.toLocaleString()}
      </p>

      <div
        role="progressbar"
        aria-label={`${stage.name} leads`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stage.percentage}
        aria-valuetext={`${stage.percentage.toFixed(1)} percent`}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full rounded-full ${stage.color} transition-[width] duration-500 ease-out`}
          style={{
            width: `${stage.percentage}%`,
          }}
        />
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {stage.percentage.toFixed(1)}% of leads
      </p>
    </article>
  );
}

// ==========================================
// LOADING SKELETON
// ==========================================

function PipelineSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading lead pipeline"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {STAGE_CONFIG.map((stage) => (
        <div
          key={stage.name}
          className="h-44 animate-pulse rounded-xl bg-slate-100"
        />
      ))}

      <span className="sr-only">
        Loading lead pipeline data...
      </span>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function LeadPipeline({
  leads,
  isLoading = false,
}: LeadPipelineProps) {
  const stages = useMemo(
    () => calculatePipeline(leads),
    [leads]
  );

  const totalLeads = leads.length;

  return (
    <section
      aria-labelledby="lead-pipeline-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-50 p-3">
            <Target
              size={20}
              className="text-violet-600"
              aria-hidden="true"
            />
          </div>

          <div>
            <h2
              id="lead-pipeline-title"
              className="text-lg font-bold text-slate-900"
            >
              Lead Pipeline
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track your leads across every CRM stage
            </p>
          </div>
        </div>

        <Link
          to="/leads"
          className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-semibold text-violet-600 transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          Manage Leads
          <ArrowRight
            size={17}
            aria-hidden="true"
          />
        </Link>
      </div>

      {/* SUMMARY */}

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="font-medium">
          Total Leads:
        </span>

        <span className="rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-700">
          {totalLeads.toLocaleString()}
        </span>

        <span className="text-slate-400">
          Across {LEAD_STATUSES.length} stages
        </span>
      </div>

      {/* LOADING / DATA */}

      {isLoading ? (
        <PipelineSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stages.map((stage) => (
              <PipelineStageCard
                key={stage.name}
                stage={stage}
              />
            ))}
          </div>

          {/* EMPTY STATE */}

          {totalLeads === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <Target
                size={28}
                className="mx-auto mb-3 text-slate-400"
                aria-hidden="true"
              />

              <h3 className="font-semibold text-slate-800">
                No leads available
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add your first lead to start tracking
                business opportunities.
              </p>

              <Link
                to="/leads"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Go to Leads
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
