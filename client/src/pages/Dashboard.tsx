
import { Bot } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import LeadPipeline from '../components/LeadPipeline'

const metrics = [
  { label: 'Total Customers', value: '1,248', change: '+12.5%' },
  { label: 'Active Leads', value: '186', change: '+8.2%' },
  { label: 'Total Revenue', value: 'AED 425K', change: '+15.3%' },
  { label: 'Conversion Rate', value: '32.8%', change: '+4.1%' },
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <LeadPipeline />

      <section className="rounded-2xl border border-violet-200 bg-white p-6">
        <div className="mb-3 flex items-center gap-3">
          <Bot className="text-violet-600" />
          <h3 className="text-lg font-bold">
            DubaiBiz AI Assistant
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          AI-powered customer support and lead insights will be
          integrated in Day 7.
        </p>
      </section>
    </div>
  )
}
