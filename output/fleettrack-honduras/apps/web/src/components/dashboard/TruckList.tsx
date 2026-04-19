'use client'

import { useRealtimeTracking } from '@/hooks/useRealtimeTracking'
import { STATUS_COLORS, STATUS_LABELS, timeAgo } from '@/lib/utils'
import { Battery, Signal } from 'lucide-react'
import type { Route } from '@fleettrack/shared'

export function TruckList({ initialRoutes }: { initialRoutes: Route[] }) {
  const { trucks } = useRealtimeTracking(initialRoutes)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#D2D2D7]">
        <h2 className="text-sm font-semibold text-[#1D1D1F]">Camiones activos</h2>
        <p className="text-xs text-[#6E6E73] mt-0.5">{trucks.length} en ruta</p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#D2D2D7]">
        {trucks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#6E6E73]">Sin rutas activas hoy</p>
          </div>
        ) : (
          trucks.map(truck => {
            const color = STATUS_COLORS[truck.status]
            return (
              <div key={truck.driver_id} className="px-4 py-3 hover:bg-[#F5F5F7] cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className="relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      🚛
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: color }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#1D1D1F] truncate">
                        {truck.driver_name}
                      </p>
                      {truck.truck_plate && (
                        <span className="text-xs text-[#6E6E73] shrink-0 ml-1">
                          {truck.truck_plate}
                        </span>
                      )}
                    </div>

                    <p className="text-xs mt-0.5" style={{ color }}>
                      {STATUS_LABELS[truck.status]}
                    </p>

                    {truck.current_delivery && (
                      <p className="text-xs text-[#6E6E73] truncate mt-0.5">
                        → {truck.current_delivery.customer_name}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[#6E6E73]">
                        {timeAgo(truck.last_seen)}
                      </span>
                      {truck.battery_pct !== undefined && (
                        <div className="flex items-center gap-0.5">
                          <Battery className="w-2.5 h-2.5 text-[#6E6E73]" />
                          <span className={`text-[10px] ${truck.battery_pct < 20 ? 'text-[#FF375F]' : 'text-[#6E6E73]'}`}>
                            {truck.battery_pct}%
                          </span>
                        </div>
                      )}
                      {!truck.is_online && (
                        <div className="flex items-center gap-0.5">
                          <Signal className="w-2.5 h-2.5 text-[#FF375F]" />
                          <span className="text-[10px] text-[#FF375F]">Sin señal</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
