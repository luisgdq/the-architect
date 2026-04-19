'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Package, Users, Bell, BarChart3, AlertTriangle, Truck, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@fleettrack/shared'

const navItems = [
  { href: '/dashboard', icon: Map, label: 'Mapa en vivo' },
  { href: '/dashboard/deliveries', icon: Package, label: 'Entregas' },
  { href: '/dashboard/drivers', icon: Users, label: 'Motoristas' },
  { href: '/dashboard/alerts', icon: Bell, label: 'Alertas' },
  { href: '/dashboard/incidents', icon: AlertTriangle, label: 'Incidencias' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analíticas' },
]

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex w-56 xl:w-60 flex-col bg-white border-r border-[#D2D2D7] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[#D2D2D7]">
        <div className="w-7 h-7 bg-[#0071E3] rounded-lg flex items-center justify-center shrink-0">
          <Truck className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-[#1D1D1F] text-sm">FleetTrack</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-[#D2D2D7]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 bg-[#F5F5F7] rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-[#1D1D1F]">
              {profile.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1D1D1F] truncate">{profile.full_name}</p>
            <p className="text-xs text-[#6E6E73] truncate">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 h-8 rounded-lg text-xs text-[#6E6E73] hover:text-[#FF375F] hover:bg-red-50 transition-colors mt-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
