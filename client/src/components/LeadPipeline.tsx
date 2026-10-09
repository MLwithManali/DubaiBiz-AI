
import { useState } from 'react'
import { Plus } from 'lucide-react'

type Lead = {
  id: number
  name: string
  value: string
  status: string
}

const stages = [
  'New',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
]

const initialLeads: Lead[] = [
  { id: 1, name: 'Emirates Trading LLC', value: 'AED 45,000', status: 'New' },
  { id: 2, name: 'Dubai Tech Solutions', value: 'AED 28,000', status: 'Qualified' },
  { id: 3, name: 'Gulf Business Group', value: 'AED 75,000', status: 'Proposal' },
  { id: 4, name: 'Marina Properties', value: 'AED 62,000', status: 'Negotiation' },
  { id: 5, name: 'Desert Star LLC', value: 'AED 35,000', status: 'Won' },
]

export default function LeadPipeline() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)

  function addLead() {
    const name = window.prompt('Enter company name')

    if (!name?.trim()) return

    setLeads((current) => [
      ...current,
      {
        id: Date.now(),
        name: name.trim(),
        value: 'AED 0',
        status: 'New',
      },
    ])
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Sales Pipeline</h3>
          <p className="text-sm text-slate-500">
            Track your business opportunities
          </p>
        </div>

        <button
          onClick={addLead}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Lead
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stages.map((stage) => (
          <div
            key={stage}
            className="min-h-52 rounded-xl bg-slate-100 p-3"
          >
            <h4 className="mb-4 font-semibold">{stage}</h4>

            {leads
              .filter((lead) => lead.status === stage)
              .map((lead) => (
                <div
                  key={lead.id}
                  className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="mt-2 text-sm font-semibold text-blue-600">
                    {lead.value}
                  </p>
                  <span className="text-xs text-slate-400">
                    {lead.status}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  )
}
