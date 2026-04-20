'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Route, TruckRealtime, TruckStatus, Location } from '@fleettrack/shared'

function inferStatus(location: Location, driverStatus: string): TruckStatus {
  if (!location.is_online) return 'offline'
  if (driverStatus === 'emergency') return 'emergency' as TruckStatus
  if (driverStatus === 'delivering') return 'delivering'
  if (location.speed_kmh > 3) return 'moving'
  return 'stopped'
}

export function useRealtimeTracking(initialRoutes: Route[]) {
  const [trucks, setTrucks] = useState<TruckRealtime[]>(() =>
    initialRoutes.flatMap(route => {
      if (!route.driver) return []
      const driverId = route.driver_id
      if (!driverId) return []

      return [{
        driver_id: driverId,
        truck_id: route.truck_id,
        driver_name: route.driver.profile?.full_name ?? 'Motorista',
        truck_plate: route.driver.truck?.plate,
        lat: 14.0723,
        lng: -87.1921,
        speed_kmh: 0,
        is_online: false,
        last_seen: route.created_at,
        status: 'offline' as TruckStatus,
      }]
    })
  )

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime-locations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'locations' },
        (payload) => {
          const loc = payload.new as Location

          setTrucks(prev => {
            const existing = prev.find(t => t.driver_id === loc.driver_id)
            const route = initialRoutes.find(r => r.driver_id === loc.driver_id)
            const driverStatus = route?.driver?.current_status ?? 'on_route'

            const updated: TruckRealtime = {
              driver_id: loc.driver_id,
              truck_id: loc.truck_id,
              driver_name: existing?.driver_name ?? route?.driver?.profile?.full_name ?? 'Motorista',
              truck_plate: existing?.truck_plate ?? route?.driver?.truck?.plate,
              lat: Number(loc.lat),
              lng: Number(loc.lng),
              speed_kmh: Number(loc.speed_kmh),
              heading: loc.heading ? Number(loc.heading) : undefined,
              battery_pct: loc.battery_pct ?? undefined,
              is_online: loc.is_online,
              last_seen: loc.recorded_at,
              status: inferStatus(loc, driverStatus),
              current_delivery: existing?.current_delivery,
            }

            if (!existing) return [...prev, updated]
            return prev.map(t => t.driver_id === loc.driver_id ? updated : t)
          })
        }
      )
      .subscribe()

    // Also listen to alerts for emergency status
    const alertChannel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: "type=eq.emergency" },
        (payload) => {
          const alert = payload.new
          if (!alert.driver_id) return
          setTrucks(prev =>
            prev.map(t =>
              t.driver_id === alert.driver_id
                ? { ...t, status: 'emergency' as TruckStatus }
                : t
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(alertChannel)
    }
  }, []) // Subscribe once on mount

  return { trucks }
}
