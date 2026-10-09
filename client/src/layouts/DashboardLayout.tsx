
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      <Sidebar />

      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <Header />
        <Outlet />
      </main>
    </div>
  )
}
