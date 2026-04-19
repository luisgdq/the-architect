import { Package, CheckCircle, Truck, AlertTriangle } from 'lucide-react'

interface KPIData {
  total_deliveries?: number
  completed_deliveries?: number
  active_routes?: number
  total_incidents?: number
  completion_rate?: number
}

export function KPICards({ data }: { data: KPIData | null }) {
  const cards = [
    {
      label: 'Entregas hoy',
      value: data?.total_deliveries ?? 0,
      icon: Package,
      color: '#0071E3',
      bg: 'bg-blue-50',
    },
    {
      label: 'Completadas',
      value: data?.completed_deliveries ?? 0,
      icon: CheckCircle,
      color: '#30D158',
      bg: 'bg-green-50',
    },
    {
      label: 'Rutas activas',
      value: data?.active_routes ?? 0,
      icon: Truck,
      color: '#FF9F0A',
      bg: 'bg-amber-50',
    },
    {
      label: 'Incidencias',
      value: data?.total_incidents ?? 0,
      icon: AlertTriangle,
      color: '#FF375F',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 w-64">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] border border-[#D2D2D7]/50"
        >
          <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center mb-2`}>
            <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
          </div>
          <p className="text-2xl font-bold text-[#1D1D1F]">{card.value}</p>
          <p className="text-[11px] text-[#6E6E73] mt-0.5 leading-tight">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
