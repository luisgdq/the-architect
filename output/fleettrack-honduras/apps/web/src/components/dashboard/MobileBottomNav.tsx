'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Package, Users, Bell, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', icon: Map, label: 'Mapa' },
  { href: '/dashboard/deliveries', icon: Package, label: 'Entregas' },
  { href: '/dashboard/drivers', icon: Users, label: 'Motoristas' },
  { href: '/dashboard/alerts', icon: Bell, label: 'Alertas' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analíticas' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#D2D2D7] flex safe-area-bottom z-20">
      {items.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-[#0071E3]' : 'text-[#6E6E73]'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive && 'text-[#0071E3]')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
