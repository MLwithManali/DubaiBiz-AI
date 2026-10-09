
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  Bot,
  Settings,
  Building2,
} from 'lucide-react'

const menuItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Leads', path: '/leads', icon: Target },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'AI Assistant', path: '/assistant', icon: Bot },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-blue-600 p-2 text-white">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-700">
            DubaiBiz AI
          </h1>
          <p className="text-xs text-slate-400">
            Business Management
          </p>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto md:flex-col">
        {menuItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
