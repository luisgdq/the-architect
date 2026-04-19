'use client'

import { Bell, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@fleettrack/shared'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Mapa en vivo',
  '/dashboard/deliveries': 'Entregas',
  '/dashboard/drivers': 'Motoristas',
  '/dashboard/alerts': 'Alertas',
  '/dashboard/incidents': 'Incidencias',
  '/dashboard/analytics': 'Analíticas',
}

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function loadCount() {
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_resolved', false)
      setUnreadAlerts(count ?? 0)
    }

    loadCount()

    const channel = supabase
      .channel('alerts-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        setUnreadAlerts(prev => prev + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const title = PAGE_TITLES[pathname] ?? 'FleetTrack'

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-[#D2D2D7] shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu icon — functional with MobileBottomNav */}
        <button className="lg:hidden p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73]">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-[#1D1D1F] text-sm">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Alerts bell */}
        <Link href="/dashboard/alerts" className="relative p-2 rounded-lg hover:bg-[#F5F5F7] transition-colors">
          <Bell className="w-5 h-5 text-[#6E6E73]" />
          {unreadAlerts > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF375F] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadAlerts > 9 ? '9+' : unreadAlerts}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <div className="w-7 h-7 bg-[#0071E3]/10 rounded-full flex items-center justify-center">
          <span className="text-xs font-semibold text-[#0071E3]">
            {profile.full_name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  )
}
