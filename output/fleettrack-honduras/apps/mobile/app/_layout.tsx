import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { supabase } from '~/lib/supabase'
import { initOfflineDb, offlineQueue } from '~/lib/offline'
import { useRouter, useSegments } from 'expo-router'
import type { Session } from '@supabase/supabase-js'
import '../global.css'
import AppState from 'react-native/Libraries/AppState/AppState'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    initOfflineDb()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitialized(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })

    // Sync offline queue when app becomes active
    const appStateListener = AppState.addEventListener('change', state => {
      if (state === 'active') offlineQueue.sync()
    })

    return () => {
      subscription.unsubscribe()
      appStateListener.remove()
    }
  }, [])

  useEffect(() => {
    if (!initialized) return
    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(driver)')
    }
  }, [session, initialized, segments])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        <Stack.Screen name="(driver)" options={{ animation: 'none' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
