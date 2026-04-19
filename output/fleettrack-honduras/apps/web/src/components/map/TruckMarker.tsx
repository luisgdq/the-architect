import { STATUS_COLORS } from '@/lib/utils'
import type { TruckRealtime } from '@fleettrack/shared'

export function TruckMarker({ truck }: { truck: TruckRealtime }) {
  const color = STATUS_COLORS[truck.status]
  const isEmergency = truck.status === 'emergency'

  return (
    <div className="relative flex flex-col items-center" style={{ cursor: 'pointer' }}>
      {/* Emergency pulse ring */}
      {isEmergency && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-75"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Truck icon container */}
      <div
        className="relative w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-lg"
        style={{ backgroundColor: color }}
      >
        🚛
      </div>

      {/* Status dot */}
      <div
        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
        style={{ backgroundColor: truck.is_online ? color : '#8E8E93' }}
      />

      {/* Truck plate label */}
      {truck.truck_plate && (
        <div className="mt-1 px-1.5 py-0.5 bg-white rounded text-[10px] font-semibold text-[#1D1D1F] shadow-sm border border-[#D2D2D7] whitespace-nowrap">
          {truck.truck_plate}
        </div>
      )}
    </div>
  )
}
