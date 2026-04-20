import { createClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: driverScores },
    { data: incidentsByType },
    { data: deliveryTrend },
  ] = await Promise.all([
    supabase
      .from('driver_scores')
      .select(`
        *,
        driver:drivers(profile:profiles(full_name))
      `)
      .gte('date', fromDate)
      .order('date', { ascending: false }),

    supabase
      .from('incidents')
      .select('type, created_at, lat, lng')
      .gte('created_at', `${fromDate}T00:00:00`),

    supabase
      .from('deliveries')
      .select('status, created_at, delivered_at, arrived_at')
      .gte('created_at', `${fromDate}T00:00:00`)
      .order('created_at'),
  ])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Analíticas</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">Últimos 30 días</p>
      </div>
      <AnalyticsDashboard
        driverScores={driverScores ?? []}
        incidentsByType={incidentsByType ?? []}
        deliveryTrend={deliveryTrend ?? []}
      />
    </div>
  )
}
