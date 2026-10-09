
import { TrendingUp } from 'lucide-react'

type MetricCardProps = {
  label: string
  value: string
  change: string
}

export default function MetricCard({
  label,
  value,
  change,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>

      <h3 className="mt-3 text-2xl font-bold text-slate-900">
        {value}
      </h3>

      <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
        <TrendingUp size={16} />
        <span>{change}</span>
        <span className="text-slate-400">demo data</span>
      </div>
    </div>
  )
}
