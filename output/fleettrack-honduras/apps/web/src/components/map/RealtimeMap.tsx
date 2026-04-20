'use client'

import { useEffect, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { useRealtimeTracking } from '@/hooks/useRealtimeTracking'
import { TruckMarker } from './TruckMarker'
import { useState } from 'react'
import { STATUS_LABELS, timeAgo, cn } from '@/lib/utils'
import { Battery, Clock, Package } from 'lucide-react'
import type { Route, TruckRealtime } from '@fleettrack/shared'

const HONDURAS_CENTER = { lat: 14.0723, lng: -87.1921 }

interface Props {
  initialRoutes: Route[]
}

function MapContent({ initialRoutes }: Props) {
  const { trucks } = useRealtimeTracking(initialRoutes)
  const [selectedTruck, setSelectedTruck] = useState<TruckRealtime | null>(null)
  const map = useMap()

  useEffect(() => {
    if (!map || trucks.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    trucks.forEach(t => bounds.extend({ lat: t.lat, lng: t.lng }))
    if (!bounds.isEmpty()) map.fitBounds(bounds, 80)
  }, [map, trucks.length]) // Only on mount/truck count change

  return (
    <>
      {trucks.map(truck => (
        <AdvancedMarker
          key={truck.driver_id}
          position={{ lat: truck.lat, lng: truck.lng }}
          onClick={() => setSelectedTruck(truck)}
          zIndex={truck.status === 'emergency' ? 100 : 10}
        >
          <TruckMarker truck={truck} />
        </AdvancedMarker>
      ))}

      {selectedTruck && (
        <InfoWindow
          position={{ lat: selectedTruck.lat, lng: selectedTruck.lng }}
          onCloseClick={() => setSelectedTruck(null)}
          pixelOffset={[0, -48]}
        >
          <TruckInfoWindow truck={selectedTruck} />
        </InfoWindow>
      )}
    </>
  )
}

function TruckInfoWindow({ truck }: { truck: TruckRealtime }) {
  const statusLabel = STATUS_LABELS[truck.status]
  const statusColor = {
    moving: 'text-[#30D158]',
    stopped: 'text-[#FF9F0A]',
    delivering: 'text-[#0071E3]',
    off_route: 'text-[#BF5AF2]',
    offline: 'text-[#8E8E93]',
  }[truck.status]

  return (
    <div className="p-1 min-w-48">
      <div className="font-semibold text-[#1D1D1F] text-sm">{truck.driver_name}</div>
      {truck.truck_plate && (
        <div className="text-xs text-[#6E6E73] mb-2">{truck.truck_plate}</div>
      )}

      <div className={cn('text-xs font-medium mb-2', statusColor)}>
        ● {statusLabel}
      </div>

      <div className="space-y-1.5">
        {truck.current_delivery && (
          <div className="flex items-center gap-1.5 text-xs text-[#1D1D1F]">
            <Package className="w-3 h-3 text-[#6E6E73]" />
            {truck.current_delivery.customer_name}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-[#6E6E73]">
          <Clock className="w-3 h-3" />
          {timeAgo(truck.last_seen)}
        </div>
        {truck.battery_pct !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-[#6E6E73]">
            <Battery className="w-3 h-3" />
            {truck.battery_pct}% batería
          </div>
        )}
        <div className="text-xs text-[#6E6E73]">
          {truck.speed_kmh.toFixed(0)} km/h
        </div>
      </div>
    </div>
  )
}

export function RealtimeMap({ initialRoutes }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={HONDURAS_CENTER}
        defaultZoom={12}
        mapId="fleettrack-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <MapContent initialRoutes={initialRoutes} />
      </Map>
    </APIProvider>
  )
}
