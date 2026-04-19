'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Star, TrendingUp, AlertTriangle } from 'lucide-react'
import { INCIDENT_LABELS } from '@fleettrack/shared'
import type { DriverScore } from '@fleettrack/shared'

const COLORS = ['#0071E3', '#30D158', '#FF9F0A', '#FF375F', '#BF5AF2', '#8E8E93']

interface Props {
  driverScores: DriverScore[]
  incidentsByType: { type: string; created_at: string; lat?: number; lng?: number }[]
  deliveryTrend: { status: string; created_at: string }[]
}

export function AnalyticsDashboard({ driverScores, incidentsByType, deliveryTrend }: Props) {
  // Driver ranking — aggregate by driver, last 30 days avg
  const driverAggregates = Object.values(
    driverScores.reduce((acc, score) => {
      const name = score.driver?.profile?.full_name ?? 'Motorista'
      if (!acc[score.driver_id]) {
        acc[score.driver_id] = { name, scores: [], deliveries: 0, incidents: 0 }
      }
      acc[score.driver_id].scores.push(score.overall_score)
      acc[score.driver_id].deliveries += score.deliveries_count
      acc[score.driver_id].incidents += score.incidents_count
      return acc
    }, {} as Record<string, { name: string; scores: number[]; deliveries: number; incidents: number }>)
  ).map(d => ({
    name: d.name,
    score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
    deliveries: d.deliveries,
    incidents: d.incidents,
  })).sort((a, b) => b.score - a.score)

  // Incidents by type for pie chart
  const incidentCounts = incidentsByType.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(incidentCounts).map(([type, count]) => ({
    name: INCIDENT_LABELS[type as keyof typeof INCIDENT_LABELS] ?? type,
    value: count,
  }))

  return (
    <div className="space-y-6">
      {/* Driver ranking */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-[#FF9F0A] fill-[#FF9F0A]" />
          <h2 className="text-sm font-semibold text-[#1D1D1F]">Ranking de motoristas</h2>
        </div>

        {driverAggregates.length === 0 ? (
          <p className="text-sm text-[#6E6E73] py-4 text-center">Sin datos en los últimos 30 días</p>
        ) : (
          <div className="space-y-3">
            {driverAggregates.map((driver, i) => (
              <div key={driver.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#6E6E73] w-5">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#1D1D1F]">{driver.name}</span>
                    <span className="text-sm font-bold text-[#1D1D1F]">{driver.score}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F5F5F7] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${driver.score}%`,
                        backgroundColor: driver.score >= 80 ? '#30D158' : driver.score >= 60 ? '#FF9F0A' : '#FF375F',
                      }}
                    />
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[10px] text-[#6E6E73]">{driver.deliveries} entregas</span>
                    <span className="text-[10px] text-[#6E6E73]">{driver.incidents} incidencias</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score bar chart */}
        {driverAggregates.length > 0 && (
          <div className="bg-white rounded-xl border border-[#D2D2D7] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">Score por motorista</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={driverAggregates} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D2D2D7" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6E6E73' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6E6E73' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #D2D2D7' }}
                />
                <Bar dataKey="score" fill="#0071E3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Incidents pie chart */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl border border-[#D2D2D7] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#FF375F]" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">Incidencias por tipo</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #D2D2D7' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
