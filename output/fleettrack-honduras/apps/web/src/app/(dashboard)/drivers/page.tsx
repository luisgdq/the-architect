import { createClient } from '@/lib/supabase/server'
import { DriversClient } from '@/components/dashboard/DriversClient'

export default async function DriversPage() {
  const supabase = await createClient()

  const { data: drivers } = await supabase
    .from('drivers')
    .select(`
      *,
      profile:profiles(id, full_name, email, phone, is_active),
      truck:trucks(id, plate, brand, model, capacity_lbs)
    `)
    .order('score', { ascending: false })

  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, plate, brand, model, capacity_lbs')
    .eq('is_active', true)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Motoristas</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          {drivers?.length ?? 0} motoristas registrados
        </p>
      </div>
      <DriversClient initialDrivers={drivers ?? []} trucks={trucks ?? []} />
    </div>
  )
}
