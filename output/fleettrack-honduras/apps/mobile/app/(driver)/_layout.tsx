import { useEffect, useRef, useState } from 'react'
import { Stack } from 'expo-router'
import { View, Text, TouchableOpacity, AppState } from 'react-native'
import { supabase } from '~/lib/supabase'
import { startLocationTracking, stopLocationTracking } from '~/lib/location'
import { offlineQueue } from '~/lib/offline'

export default function DriverLayout() {
  const appState = useRef(AppState.currentState)
  const [driverId, setDriverId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: driver } = await supabase
        .from('drivers')
        .select('id, assigned_truck_id')
        .eq('profile_id', user.id)
        .single()

      if (!driver) return
      setDriverId(driver.id)

      // Start GPS tracking
      try {
        await startLocationTracking(driver.id, driver.assigned_truck_id ?? undefined)
      } catch (e) {
        console.warn('GPS error:', e)
      }
    }

    init()

    const subscription = AppState.addEventListener('change', state => {
      if (appState.current.match(/inactive|background/) && state === 'active') {
        offlineQueue.sync()
      }
      appState.current = state
    })

    return () => {
      stopLocationTracking()
      subscription.remove()
    }
  }, [])

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Mis entregas',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1D1D1F', fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
          headerRight: () => (
            <View className="mr-2 px-2 py-1 bg-green-100 rounded-full">
              <Text className="text-xs text-green-700 font-medium">● En ruta</Text>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="checklist"
        options={{
          title: 'Checklist pre-salida',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1D1D1F', fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="delivery/[id]"
        options={{
          title: 'Entrega',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1D1D1F', fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="incident"
        options={{
          title: 'Reportar incidencia',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#1D1D1F', fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="emergency"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  )
}
