import { createClient } from '@/lib/supabase/server'
import { NewDeliveryForm } from '@/components/dashboard/NewDeliveryForm'

export default async function NewDeliveryPage() {
  const supabase = await createClient()

  const [{ data: customers }, { data: routes }] = await Promise.all([
    supabase.from('customers').select('id, name, address').eq('is_active', true).order('name'),
    supabase
      .from('routes')
      .select(`
        id, name, scheduled_date, total_weight_lbs, occupancy_pct,
        truck:trucks(id, plate, capacity_lbs),
        driver:drivers(profile:profiles(full_name))
      `)
      .in('status', ['pending', 'in_progress'])
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date'),
  ])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Nueva entrega</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">Asignar una entrega a una ruta existente</p>
      </div>
      <NewDeliveryForm customers={customers ?? []} routes={routes ?? []} />
    </div>
  )
}
