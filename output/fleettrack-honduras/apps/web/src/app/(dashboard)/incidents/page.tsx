import { createClient } from '@/lib/supabase/server'
import { IncidentsClient } from '@/components/dashboard/IncidentsClient'

export default async function IncidentsPage() {
  const supabase = await createClient()

  const { data: incidents } = await supabase
    .from('incidents')
    .select(`
      *,
      driver:drivers(profile:profiles(full_name)),
      delivery:deliveries(invoice_number, customer:customers(name))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const openCount = incidents?.filter(i => i.status === 'open').length ?? 0

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Incidencias</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          {openCount} incidencia{openCount !== 1 ? 's' : ''} abiertas
        </p>
      </div>
      <IncidentsClient initialIncidents={incidents ?? []} />
    </div>
  )
}
