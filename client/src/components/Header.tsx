
import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/leads': 'Lead Management',
  '/analytics': 'Business Analytics',
  '/assistant': 'AI Assistant',
  '/settings': 'Settings',
}

export default function Header() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'DubaiBiz AI'

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          AI-Powered CRM & Business Management
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Search size={20} className="text-slate-500" />
        <Bell size={20} className="text-slate-500" />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
          A
        </div>
      </div>
    </header>
  )
}
