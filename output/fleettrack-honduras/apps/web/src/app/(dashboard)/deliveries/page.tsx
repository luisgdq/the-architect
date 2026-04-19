import { createClient } from '@/lib/supabase/server'
import { DeliveryTable } from '@/components/dashboard/DeliveryTable'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>
}) {
  const supabase = await createClient()
  const { status, date } = await searchParams

  const today = date ?? new Date().toISOString().split('T')[0]

  let query = supabase
    .from('deliveries')
    .select(`
      *,
      customer:customers(id, name, address, lat, lng),
      route:routes(
        id, scheduled_date, status,
        driver:drivers(profile:profiles(full_name)),
        truck:trucks(plate)
      )
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: deliveries } = await query.limit(100)

  const { data: stats } = await supabase
    .from('deliveries')
    .select('status')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  const statusCounts = (stats ?? []).reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1D1D1F]">Entregas</h1>
          <p className="text-sm text-[#6E6E73] mt-0.5">
            {deliveries?.length ?? 0} entregas encontradas
          </p>
        </div>
        <Link
          href="/dashboard/deliveries/new"
          className="flex items-center gap-2 px-4 h-9 bg-[#0071E3] text-white text-sm font-medium rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva entrega
        </Link>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todas', count: stats?.length ?? 0 },
          { key: 'pending', label: 'Pendientes', count: statusCounts.pending ?? 0 },
          { key: 'in_route', label: 'En ruta', count: statusCounts.in_route ?? 0 },
          { key: 'delivered', label: 'Entregadas', count: statusCounts.delivered ?? 0 },
          { key: 'incident', label: 'Incidencias', count: statusCounts.incident ?? 0 },
        ].map(s => (
          <Link
            key={s.key}
            href={`/dashboard/deliveries?status=${s.key}&date=${today}`}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-sm border transition-colors ${
              (status ?? 'all') === s.key
                ? 'bg-[#0071E3] text-white border-[#0071E3]'
                : 'bg-white text-[#1D1D1F] border-[#D2D2D7] hover:border-[#0071E3]'
            }`}
          >
            {s.label}
            <span className={`text-xs font-medium ${(status ?? 'all') === s.key ? 'text-white/80' : 'text-[#6E6E73]'}`}>
              {s.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <DeliveryTable deliveries={deliveries ?? []} />
    </div>
  )
}
