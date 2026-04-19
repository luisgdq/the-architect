'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SEVERITY_BG, timeAgo } from '@/lib/utils'
import { AlertTriangle, Bell, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Alert } from '@fleettrack/shared'

const ALERT_ICONS: Record<string, string> = {
  inactivity: '⏸',
  delay: '⏱',
  geofence_entry: '📍',
  geofence_exit: '🔔',
  signal_loss: '📶',
  emergency: '🚨',
  overload: '⚖️',
  delivery_late: '🕐',
}

export function AlertPanel({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('alerts-panel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new as Alert
          setAlerts(prev => [newAlert, ...prev])
          toast.warning(newAlert.title, { description: newAlert.message ?? undefined })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markResolved(alertId: string) {
    await supabase
      .from('alerts')
      .update({ is_resolved: true, is_read: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId)

    setAlerts(prev => prev.filter(a => a.id !== alertId))
    toast.success('Alerta resuelta')
  }

  async function markRead(alertId: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alertId)
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a))
  }

  const activeAlerts = alerts.filter(a => !a.is_resolved)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D2D2D7]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#1D1D1F]" />
          <span className="text-sm font-semibold text-[#1D1D1F]">Alertas</span>
        </div>
        {activeAlerts.length > 0 && (
          <span className="px-2 py-0.5 bg-[#FF375F] text-white text-xs font-bold rounded-full">
            {activeAlerts.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#D2D2D7]">
        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <CheckCircle className="w-8 h-8 text-[#30D158] mb-2" />
            <p className="text-sm text-[#6E6E73]">Sin alertas activas</p>
          </div>
        ) : (
          activeAlerts.map(alert => (
            <div
              key={alert.id}
              className={`px-4 py-3 ${!alert.is_read ? 'bg-[#F5F5F7]' : 'bg-white'}`}
              onClick={() => !alert.is_read && markRead(alert.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0 mt-0.5">
                  {ALERT_ICONS[alert.type] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold text-[#1D1D1F] leading-tight">
                      {alert.title}
                    </p>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${SEVERITY_BG[alert.severity]}`}>
                      {alert.severity === 'critical' ? 'Crítica' : alert.severity === 'high' ? 'Alta' : alert.severity === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>

                  {alert.driver && (
                    <p className="text-xs text-[#6E6E73] mt-0.5">
                      {alert.driver.profile?.full_name}
                    </p>
                  )}

                  {alert.message && (
                    <p className="text-xs text-[#6E6E73] mt-1 leading-relaxed">{alert.message}</p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-[#6E6E73]">{timeAgo(alert.created_at)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); markResolved(alert.id) }}
                      className="text-[10px] text-[#0071E3] hover:underline font-medium"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
