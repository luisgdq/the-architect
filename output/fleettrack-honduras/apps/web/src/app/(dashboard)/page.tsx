import { createClient } from '@/lib/supabase/server'
import { RealtimeMap } from '@/components/map/RealtimeMap'
import { AlertPanel } from '@/components/dashboard/AlertPanel'
import { KPICards } from '@/components/dashboard/KPICards'
import { TruckList } from '@/components/dashboard/TruckList'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: activeRoutes },
    { data: recentAlerts },
    { data: kpiData },
  ] = await Promise.all([
    supabase
      .from('routes')
      .select(`
        *,
        driver:drivers(
          id, current_status, score,
          profile:profiles(full_name, phone),
          truck:trucks(plate, capacity_lbs)
        ),
        deliveries(id, status)
      `)
      .eq('scheduled_date', today)
      .in('status', ['pending', 'in_progress']),

    supabase
      .from('alerts')
      .select(`*, driver:drivers(profile:profiles(full_name))`)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase.rpc('get_daily_kpi', { p_date: today }).single(),
  ])

  return (
    <div className="relative h-full flex">
      {/* Left panel — truck list */}
      <div className="hidden lg:flex w-72 xl:w-80 flex-col bg-white border-r border-[#D2D2D7] overflow-hidden">
        <TruckList initialRoutes={activeRoutes ?? []} />
      </div>

      {/* Map — center/main */}
      <div className="flex-1 relative">
        <RealtimeMap initialRoutes={activeRoutes ?? []} />

        {/* KPI overlay — top right */}
        <div className="absolute top-4 right-4 z-10 hidden md:block">
          <KPICards data={kpiData} />
        </div>
      </div>

      {/* Alert panel — right side on xl */}
      {(recentAlerts?.length ?? 0) > 0 && (
        <div className="hidden xl:flex w-72 flex-col bg-white border-l border-[#D2D2D7] overflow-hidden">
          <AlertPanel initialAlerts={recentAlerts ?? []} />
        </div>
      )}
    </div>
  )
}
