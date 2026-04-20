import { createClient } from '@/lib/supabase/server'
import { AlertsClient } from '@/components/dashboard/AlertsClient'

export default async function AlertsPage() {
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from('alerts')
    .select(`
      *,
      driver:drivers(
        id,
        profile:profiles(full_name, phone),
        truck:trucks(plate)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadCount = alerts?.filter(a => !a.is_read).length ?? 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Alertas</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          {unreadCount} alerta{unreadCount !== 1 ? 's' : ''} sin leer
        </p>
      </div>
      <AlertsClient initialAlerts={alerts ?? []} />
    </div>
  )
}
