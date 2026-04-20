import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { supabase } from './supabase'
import { offlineQueue } from './offline'

export const LOCATION_TASK = 'background-location-task'

let currentDriverId: string | null = null
let currentTruckId: string | null = null
let currentRouteId: string | null = null

export function setTrackingContext(driverId: string, truckId?: string, routeId?: string) {
  currentDriverId = driverId
  currentTruckId = truckId ?? null
  currentRouteId = routeId ?? null
}

// Adaptive GPS interval based on speed
function getLocationOptions(speed: number): Location.LocationOptions {
  if (speed > 3) {
    return { accuracy: Location.Accuracy.High, distanceInterval: 20 }
  }
  if (speed > 0.5) {
    return { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 }
  }
  return { accuracy: Location.Accuracy.Low, distanceInterval: 100 }
}

let watchSubscription: Location.LocationSubscription | null = null
let lastSpeed = 0

export async function startLocationTracking(driverId: string, truckId?: string, routeId?: string) {
  setTrackingContext(driverId, truckId, routeId)

  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado')
  }

  // Start adaptive foreground tracking
  watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (location) => {
      const speed = location.coords.speed ?? 0
      lastSpeed = speed > 0 ? speed * 3.6 : 0 // m/s → km/h

      sendLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed_kmh: lastSpeed,
        heading: location.coords.heading ?? undefined,
        accuracy_m: location.coords.accuracy ?? undefined,
      })
    }
  )
}

export async function stopLocationTracking() {
  watchSubscription?.remove()
  watchSubscription = null
  currentDriverId = null
}

interface LocationData {
  lat: number
  lng: number
  speed_kmh: number
  heading?: number
  accuracy_m?: number
}

async function sendLocation(data: LocationData) {
  if (!currentDriverId) return

  const payload = {
    driver_id: currentDriverId,
    truck_id: currentTruckId,
    route_id: currentRouteId,
    lat: data.lat,
    lng: data.lng,
    speed_kmh: data.speed_kmh,
    heading: data.heading,
    accuracy_m: data.accuracy_m,
    battery_pct: await getBatteryLevel(),
    is_online: true,
    recorded_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('locations').insert(payload)

  if (error) {
    await offlineQueue.add('location', payload)
  }
}

async function getBatteryLevel(): Promise<number | undefined> {
  try {
    const Battery = await import('expo-battery')
    const level = await Battery.getBatteryLevelAsync()
    return Math.round(level * 100)
  } catch {
    return undefined
  }
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  })
  return { lat: location.coords.latitude, lng: location.coords.longitude }
}
