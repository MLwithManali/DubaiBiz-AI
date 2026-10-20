
import {
  ArrowDownRight,
  ArrowUpRight,
  Info,
} from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
};

export default function MetricCard({
  label,
  value,
  change,
  trend = "neutral",
}: MetricCardProps) {
  const isUp = trend === "up";
  const isDown = trend === "down";

  const trendColor = isUp
    ? "text-emerald-600"
    : isDown
      ? "text-rose-600"
      : "text-slate-500";

  return (
    <article className="group relative min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg">
      {/* Decorative accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />

      {/* Metric label */}
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      {/* Metric value */}
      <p className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      {/* Metric context or trend */}
      {change && (
        <div
          className={`mt-4 flex items-center gap-2 text-sm font-medium ${trendColor}`}
        >
          {isUp ? (
            <ArrowUpRight
              size={17}
              aria-hidden="true"
            />
          ) : isDown ? (
            <ArrowDownRight
              size={17}
              aria-hidden="true"
            />
          ) : (
            <Info
              size={16}
              aria-hidden="true"
            />
          )}

          <span className="min-w-0 break-words">
            {change}
          </span>
        </div>
      )}
    </article>
  );
}
