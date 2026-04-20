# FleetTrack Honduras — Proyecto Completo

> Pega este archivo en Claude Code y dile:
> "Crea todos los archivos de este proyecto en sus rutas exactas, instala dependencias y levanta el servidor"

---

## CLAUDE.md

Crea este archivo en la raíz del proyecto:

```markdown
# FleetTrack Honduras

Sistema de rastreo logístico en tiempo real: admin web (Next.js) + app motorista (Expo React Native).

## Commands

### Web (apps/web/)
- `pnpm dev` — Servidor de desarrollo (puerto 3000)
- `pnpm build` — Build de producción
- `pnpm lint` — ESLint

### Mobile (apps/mobile/)
- `npx expo start` — Metro bundler
- `npx expo start --android` — Abrir en Android
- `eas build --platform android` — Build APK

### Raíz del monorepo
- `pnpm dev` — Corre web y mobile en paralelo
- `pnpm build` — Build de todos los paquetes

## Tech Stack

Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui + Supabase + Google Maps | Expo 51 + NativeWind + expo-location + Supabase

## Architecture

### Flujo de datos
- Admin web: Server Components leen datos → Client Components suscriben a Supabase Realtime
- Mobile: Mutations via Supabase client (RLS) → Realtime broadcast actualiza admin
- GPS: expo-location → insert en locations → pg trigger → alert si geofence

### Directorio Web (apps/web/src/)
- `app/(auth)/` — Login, sin sidebar
- `app/(dashboard)/` — Dashboard protegido, con sidebar responsive
- `components/map/` — RealtimeMap, TruckMarker
- `components/dashboard/` — Sidebar, AlertPanel, KPICards, TruckList
- `lib/supabase/` — client.ts (browser), server.ts (RSC)
- `hooks/` — useRealtimeTracking

### Directorio Mobile (apps/mobile/)
- `app/(auth)/` — Login screen
- `app/(driver)/` — Todas las pantallas del motorista
- `lib/location.ts` — GPS adaptativo + foreground service
- `lib/offline.ts` — Queue SQLite + sync

## Code Rules

1. Server Components por defecto — "use client" solo cuando hay interactividad
2. Importar con alias @/ para src/ en web, ~/ para raíz en mobile
3. Supabase server client solo en Server Components
4. Supabase browser client solo en Client Components
5. RLS maneja autorización — no duplicar lógica de permisos en frontend
6. TypeScript strict — sin any

## Design System

- Background: #F5F5F7 | Surface: #FFFFFF | Primary: #0071E3
- Text: #1D1D1F | Muted: #6E6E73 | Border: #D2D2D7
- Moving: #30D158 | Stopped: #FF9F0A | Incident: #FF375F | Off-route: #BF5AF2
- Font: Inter | Radius: 12px cards / 8px buttons / 20px badges
- Mobile buttons: min 56px height

## Environment Variables

### Web (.env.local)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_GOOGLE_MAPS_KEY

### Mobile (.env)
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
```

---

## Archivos del proyecto

### `apps/mobile/.env.example`

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

```

### `apps/mobile/app.json`

```json
{
  "expo": {
    "name": "FleetTrack",
    "slug": "fleettrack-honduras",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "fleettrack",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0071E3"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0071E3"
      },
      "package": "com.tuempresa.fleettrack",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "FOREGROUND_SERVICE",
        "POST_NOTIFICATIONS"
      ],
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_GOOGLE_MAPS_KEY"
        }
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "FleetTrack necesita acceso a tu ubicación para el rastreo de entregas.",
          "locationWhenInUsePermission": "FleetTrack necesita acceso a tu ubicación para el rastreo de entregas.",
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "FleetTrack necesita acceso a la cámara para tomar fotos de las entregas."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#0071E3",
          "defaultChannel": "default"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}

```

### `apps/mobile/app/(auth)/login.tsx`

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '~/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales inválidas. Verifica con tu administrador.')
      setLoading(false)
      return
    }

    // Navigation handled by root _layout
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo area */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-primary rounded-3xl items-center justify-center mb-4 shadow-lg">
            <Text className="text-4xl">🚛</Text>
          </View>
          <Text className="text-2xl font-bold text-text-primary">FleetTrack</Text>
          <Text className="text-sm text-text-secondary mt-1">App Motorista</Text>
        </View>

        {/* Form */}
        <View className="bg-surface rounded-2xl p-6 shadow-sm border border-border">
          <Text className="text-lg font-semibold text-text-primary mb-5">Iniciar sesión</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-text-primary mb-1.5">Correo electrónico</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              className="h-12 px-4 border border-border rounded-xl text-text-primary text-base bg-background"
              placeholder="tu@correo.com"
              placeholderTextColor="#6E6E73"
            />
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-text-primary mb-1.5">Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              className="h-12 px-4 border border-border rounded-xl text-text-primary text-base bg-background"
              placeholder="••••••••"
              placeholderTextColor="#6E6E73"
            />
          </View>

          {error ? (
            <View className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="h-14 bg-primary rounded-xl items-center justify-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-center text-xs text-text-secondary mt-6">
          Solo acceso para motoristas autorizados.{'\n'}
          Contacta a tu administrador si tienes problemas.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

```

### `apps/mobile/app/(driver)/_layout.tsx`

```tsx
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

```

### `apps/mobile/app/(driver)/checklist.tsx`

```tsx
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '~/lib/supabase'
import type { ChecklistTemplate, ChecklistItem } from '@fleettrack/shared'

export default function ChecklistScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>()
  const router = useRouter()
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [responses, setResponses] = useState<Record<string, boolean>>({})
  const [driverId, setDriverId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (driver) setDriverId(driver.id)

      const { data: tmpl } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .single()

      if (tmpl) {
        setTemplate(tmpl)
        const initial: Record<string, boolean> = {}
        tmpl.items.forEach((item: ChecklistItem) => { initial[item.id] = false })
        setResponses(initial)
      }

      setLoading(false)
    }
    load()
  }, [])

  function toggle(itemId: string) {
    setResponses(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const requiredItems = template?.items.filter(i => i.required) ?? []
  const allRequiredComplete = requiredItems.every(i => responses[i.id])
  const totalComplete = Object.values(responses).filter(Boolean).length
  const totalItems = template?.items.length ?? 0

  async function handleSubmit() {
    if (!allRequiredComplete) {
      Alert.alert('Checklist incompleto', 'Debes confirmar todos los ítems requeridos (*) antes de salir.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('checklist_responses').upsert({
      template_id: template?.id,
      route_id: routeId,
      driver_id: driverId,
      responses,
      is_complete: true,
      completed_at: new Date().toISOString(),
    })

    if (error) {
      Alert.alert('Error', 'No se pudo guardar el checklist. Intenta de nuevo.')
      setSaving(false)
      return
    }

    // Update route status to in_progress
    await supabase.from('routes').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', routeId)

    router.replace('/(driver)')
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  if (!template) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-base text-text-secondary text-center">
          No hay checklist configurado. Contacta a tu administrador.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(driver)')} className="mt-4 px-6 h-12 bg-primary rounded-xl items-center justify-center">
          <Text className="text-white font-semibold">Continuar de todas formas</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      {/* Progress header */}
      <View className="bg-surface border-b border-border px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-text-primary">{totalComplete}/{totalItems} verificados</Text>
          <Text className="text-sm text-text-secondary">{Math.round((totalComplete / Math.max(totalItems, 1)) * 100)}%</Text>
        </View>
        <View className="h-2 bg-background rounded-full overflow-hidden">
          <View
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(totalComplete / Math.max(totalItems, 1)) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ gap: 10 }}>
        <Text className="text-xs text-text-secondary mb-1">Los ítems marcados con * son obligatorios</Text>

        {template.items.map((item: ChecklistItem) => {
          const checked = responses[item.id] ?? false
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
              className={`flex-row items-center gap-3 p-4 rounded-2xl border ${
                checked
                  ? 'bg-green-50 border-green-200'
                  : 'bg-surface border-border'
              }`}
            >
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                checked ? 'bg-moving border-moving' : 'border-border'
              }`}>
                {checked && <Text className="text-white text-sm font-bold">✓</Text>}
              </View>
              <Text className={`flex-1 text-sm font-medium ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>
                {item.label}
                {item.required && <Text className="text-danger"> *</Text>}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Submit button */}
      <View className="px-4 py-4 bg-surface border-t border-border">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving || !allRequiredComplete}
          className={`h-14 rounded-xl items-center justify-center ${
            allRequiredComplete ? 'bg-primary' : 'bg-border'
          }`}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className={`font-semibold text-base ${allRequiredComplete ? 'text-white' : 'text-text-secondary'}`}>
              {allRequiredComplete ? 'Iniciar ruta ✓' : 'Completa los ítems requeridos'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

```

### `apps/mobile/app/(driver)/delivery/[id].tsx`

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, Modal,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '~/lib/supabase'
import { getCurrentLocation } from '~/lib/location'
import { offlineQueue } from '~/lib/offline'
import type { Delivery } from '@fleettrack/shared'
import { DELIVERY_STATUS_LABELS } from '@fleettrack/shared'

type DeliveryStep = 'arrived' | 'photo' | 'decision' | 'signature' | 'done' | 'incident'

export default function DeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [driverId, setDriverId] = useState<string | null>(null)
  const [step, setStep] = useState<DeliveryStep>('arrived')
  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 2-hour timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [timerExpired, setTimerExpired] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', user.id).single()
      if (driver) setDriverId(driver.id)

      const { data } = await supabase
        .from('deliveries')
        .select('*, customer:customers(*)')
        .eq('id', id)
        .single()

      if (data) {
        setDelivery(data)
        if (data.status === 'arrived' || data.status === 'in_progress') {
          setStep('photo')
          if (data.delivery_started_at) {
            const elapsed = Date.now() - new Date(data.delivery_started_at).getTime()
            const remaining = (data.time_limit_minutes * 60 * 1000) - elapsed
            setTimeLeft(Math.max(0, Math.round(remaining / 1000)))
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { setTimerExpired(true); return }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (!prev || prev <= 1) {
          clearInterval(timerRef.current!)
          setTimerExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timeLeft])

  async function handleArrived() {
    setSaving(true)
    const location = await getCurrentLocation()
    const now = new Date().toISOString()
    const limitMinutes = delivery?.time_limit_minutes ?? 120
    const remaining = limitMinutes * 60

    await supabase.from('deliveries').update({
      status: 'in_progress',
      arrived_at: now,
      delivery_started_at: now,
    }).eq('id', id)

    await supabase.from('events').insert({
      type: 'delivery_arrived',
      driver_id: driverId,
      delivery_id: id,
      lat: location.lat,
      lng: location.lng,
    })

    setTimeLeft(remaining)
    setStep('photo')
    setSaving(false)
  }

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    })

    if (!result.canceled) {
      setPhoto(result.assets[0].uri)
      setStep('decision')
    }
  }

  async function uploadPhoto(uri: string): Promise<string | null> {
    try {
      const response = await fetch(uri)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()

      const filename = `${driverId}/${id}/${Date.now()}.jpg`
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filename, arrayBuffer, { contentType: 'image/jpeg' })

      if (error) return null
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path)
      return publicUrl
    } catch {
      return null
    }
  }

  async function handleDelivered() {
    if (!photo || !driverId) return
    setSaving(true)

    const location = await getCurrentLocation()
    const photoUrl = await uploadPhoto(photo)
    const now = new Date().toISOString()

    const updatePayload = {
      status: 'delivered' as const,
      delivered_at: now,
    }

    const { error } = await supabase.from('deliveries').update(updatePayload).eq('id', id)

    if (error) {
      await offlineQueue.add('delivery_update', { id, ...updatePayload })
    }

    if (photoUrl) {
      const photoRecord = {
        delivery_id: id,
        driver_id: driverId,
        photo_url: photoUrl,
        photo_type: 'delivery' as const,
        lat: location.lat,
        lng: location.lng,
      }
      const { error: photoError } = await supabase.from('delivery_photos').insert(photoRecord)
      if (photoError) await offlineQueue.add('photo', photoRecord)
    }

    await supabase.from('events').insert({
      type: 'delivery_complete',
      driver_id: driverId,
      delivery_id: id,
      lat: location.lat,
      lng: location.lng,
    })

    setSaving(false)
    setStep('done')
  }

  function handleReportIncident() {
    router.push({ pathname: '/(driver)/incident', params: { deliveryId: id, driverId: driverId ?? '' } })
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  // Timer expired modal
  if (timerExpired) {
    return (
      <View className="flex-1 bg-danger items-center justify-center px-6">
        <Text className="text-6xl mb-4">⏰</Text>
        <Text className="text-2xl font-bold text-white mb-2 text-center">Tiempo agotado</Text>
        <Text className="text-base text-white/90 text-center mb-6">
          Han pasado {delivery?.time_limit_minutes} minutos desde tu llegada.{'\n'}
          Se necesita autorización del administrador para continuar.
        </Text>
        <View className="bg-white/20 rounded-2xl p-4 w-full">
          <Text className="text-white text-sm text-center">
            El administrador ha sido notificado y debe autorizar esta entrega.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16 }}>
      {/* Customer info */}
      <View className="bg-surface rounded-2xl p-4 border border-border mb-4 shadow-sm">
        <Text className="text-lg font-bold text-text-primary">{delivery?.customer?.name}</Text>
        {delivery?.customer?.address && (
          <Text className="text-sm text-text-secondary mt-1">{delivery.customer.address}</Text>
        )}
        {delivery?.invoice_number && (
          <Text className="text-xs text-text-secondary mt-2">Factura: {delivery.invoice_number}</Text>
        )}
        <View className="flex-row gap-4 mt-2">
          <Text className="text-xs text-text-secondary">{delivery?.weight_lbs} lbs</Text>
        </View>
      </View>

      {/* Timer (when active) */}
      {timeLeft !== null && step !== 'done' && (
        <View className={`rounded-2xl p-4 mb-4 border ${timeLeft < 600 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <Text className={`text-xs font-medium mb-1 ${timeLeft < 600 ? 'text-red-700' : 'text-amber-700'}`}>
            ⏱ Tiempo restante para entrega
          </Text>
          <Text className={`text-2xl font-bold ${timeLeft < 600 ? 'text-red-700' : 'text-amber-700'}`}>
            {formatTime(timeLeft)}
          </Text>
        </View>
      )}

      {/* Steps */}
      {step === 'arrived' && (
        <View className="items-center py-6">
          <Text className="text-5xl mb-4">📍</Text>
          <Text className="text-lg font-bold text-text-primary mb-2">¿Llegaste al cliente?</Text>
          <Text className="text-sm text-text-secondary text-center mb-6">
            Confirma tu llegada para iniciar el proceso de entrega
          </Text>
          <TouchableOpacity
            onPress={handleArrived}
            disabled={saving}
            className="h-14 bg-primary rounded-xl w-full items-center justify-center"
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text className="text-white font-semibold text-base">Llegué ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {step === 'photo' && (
        <View className="items-center py-4">
          <Text className="text-5xl mb-4">📸</Text>
          <Text className="text-lg font-bold text-text-primary mb-2">Tomar foto de la entrega</Text>
          <Text className="text-sm text-text-secondary text-center mb-6">
            Toma una foto que evidencie el estado de la mercancía y el punto de entrega
          </Text>
          <TouchableOpacity
            onPress={takePhoto}
            className="h-14 bg-primary rounded-xl w-full items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">Abrir cámara</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'decision' && photo && (
        <View className="gap-4">
          <Image source={{ uri: photo }} className="w-full h-48 rounded-2xl" resizeMode="cover" />

          <Text className="text-base font-semibold text-text-primary text-center">
            ¿Cómo quedó la entrega?
          </Text>

          <TouchableOpacity
            onPress={handleDelivered}
            disabled={saving}
            className="h-14 bg-moving rounded-xl items-center justify-center"
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text className="text-white font-semibold text-base">✓ Entrega correcta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReportIncident}
            className="h-14 bg-danger rounded-xl items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">⚠ Reportar problema</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={takePhoto}
            className="h-10 items-center justify-center"
          >
            <Text className="text-primary text-sm font-medium">Volver a tomar foto</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'done' && (
        <View className="items-center py-6">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
            <Text className="text-4xl">✅</Text>
          </View>
          <Text className="text-xl font-bold text-text-primary mb-2">Entrega completada</Text>
          <Text className="text-sm text-text-secondary text-center mb-6">
            La entrega a {delivery?.customer?.name} ha sido registrada exitosamente
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-14 bg-primary rounded-xl w-full items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">Volver a mis entregas</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

```

### `apps/mobile/app/(driver)/emergency.tsx`

```tsx
import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Vibration, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '~/lib/supabase'
import { getCurrentLocation } from '~/lib/location'

const HOLD_DURATION = 3000 // 3 seconds hold to confirm

export default function EmergencyScreen() {
  const router = useRouter()
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTime = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current)
    }
  }, [])

  function onPressIn() {
    startTime.current = Date.now()
    setHolding(true)
    Vibration.vibrate(100)

    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current
      const p = Math.min(elapsed / HOLD_DURATION, 1)
      setProgress(p)

      if (p >= 1) {
        clearInterval(holdTimer.current!)
        sendEmergency()
      }
    }, 50)
  }

  function onPressOut() {
    if (holdTimer.current) clearInterval(holdTimer.current)
    setHolding(false)
    setProgress(0)
  }

  async function sendEmergency() {
    setSending(true)
    Vibration.vibrate([0, 200, 100, 200])

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: driver } = await supabase
      .from('drivers')
      .select('id, assigned_truck_id')
      .eq('profile_id', user.id)
      .single()

    if (!driver) return

    const location = await getCurrentLocation().catch(() => ({ lat: 0, lng: 0 }))

    await supabase.from('alerts').insert({
      type: 'emergency',
      severity: 'critical',
      driver_id: driver.id,
      title: '🚨 EMERGENCIA — Motorista necesita ayuda urgente',
      message: `El motorista ha activado el botón de emergencia. Coordenadas: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
      metadata: { lat: location.lat, lng: location.lng },
    })

    await supabase.from('drivers').update({ current_status: 'emergency' }).eq('id', driver.id)

    await supabase.from('events').insert({
      type: 'emergency',
      driver_id: driver.id,
      truck_id: driver.assigned_truck_id,
      lat: location.lat,
      lng: location.lng,
      metadata: { source: 'driver_button' },
    })

    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <View className="flex-1 bg-danger items-center justify-center px-6">
        <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-6">
          <Text className="text-5xl">✓</Text>
        </View>
        <Text className="text-3xl font-bold text-white mb-3 text-center">Alerta enviada</Text>
        <Text className="text-base text-white/90 text-center mb-8">
          Tu administrador ha sido notificado y enviará ayuda a tu ubicación inmediatamente.
        </Text>
        <View className="bg-white/20 rounded-2xl p-4 w-full mb-6">
          <Text className="text-white text-sm text-center">
            Permanece en tu vehículo y no apagues el teléfono.
            Tu ubicación está siendo rastreada.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="border-2 border-white/60 rounded-xl px-8 h-12 items-center justify-center"
        >
          <Text className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#1D1D1F] items-center justify-center px-6">
      <Text className="text-white text-xl font-bold mb-2">Botón de emergencia</Text>
      <Text className="text-white/60 text-sm text-center mb-12">
        Mantén presionado el botón por 3 segundos para enviar una alerta de emergencia a tu administrador
      </Text>

      {/* Big emergency button */}
      <TouchableOpacity
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        disabled={sending}
        className="w-52 h-52 rounded-full items-center justify-center"
        style={{
          backgroundColor: holding ? '#CC2C3F' : '#FF375F',
          transform: [{ scale: holding ? 0.95 : 1 }],
          shadowColor: '#FF375F',
          shadowOpacity: 0.5,
          shadowRadius: 30,
          elevation: 20,
        }}
      >
        {sending ? (
          <ActivityIndicator color="white" size="large" />
        ) : (
          <>
            <Text className="text-6xl mb-2">🚨</Text>
            <Text className="text-white font-bold text-lg">EMERGENCIA</Text>
            {holding && (
              <View className="mt-3 w-32 h-2 bg-white/30 rounded-full overflow-hidden">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>
            )}
          </>
        )}
      </TouchableOpacity>

      <Text className="text-white/40 text-xs text-center mt-10">
        {holding ? `Suelta para cancelar...` : 'Mantén presionado 3 segundos'}
      </Text>

      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-8 px-8 h-12 border border-white/20 rounded-xl items-center justify-center"
      >
        <Text className="text-white/60 text-sm">Cancelar</Text>
      </TouchableOpacity>
    </View>
  )
}

```

### `apps/mobile/app/(driver)/incident.tsx`

```tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '~/lib/supabase'
import { getCurrentLocation } from '~/lib/location'
import { offlineQueue } from '~/lib/offline'
import { INCIDENT_LABELS } from '@fleettrack/shared'
import type { IncidentType } from '@fleettrack/shared'

const INCIDENT_TYPES: IncidentType[] = [
  'traffic', 'accident', 'vehicle_issue', 'customer_absent',
  'wrong_address', 'product_damage', 'other',
]

export default function IncidentScreen() {
  const { deliveryId, driverId } = useLocalSearchParams<{ deliveryId: string; driverId: string }>()
  const router = useRouter()

  const [type, setType] = useState<IncidentType | null>(null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (!result.canceled) setPhoto(result.assets[0].uri)
  }

  async function handleSubmit() {
    if (!type) {
      Alert.alert('Tipo requerido', 'Selecciona el tipo de incidencia')
      return
    }

    setSaving(true)
    const location = await getCurrentLocation()
    let photoUrl: string | null = null

    if (photo) {
      const response = await fetch(photo)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const filename = `${driverId}/incidents/${Date.now()}.jpg`
      const { data } = await supabase.storage.from('photos').upload(filename, arrayBuffer, { contentType: 'image/jpeg' })
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path)
        photoUrl = publicUrl
      }
    }

    const incident = {
      delivery_id: deliveryId || null,
      driver_id: driverId,
      type,
      description: description || null,
      photo_url: photoUrl,
      lat: location.lat,
      lng: location.lng,
      status: 'open' as const,
    }

    const { error } = await supabase.from('incidents').insert(incident)

    if (error) {
      await offlineQueue.add('incident', incident)
    }

    // Mark delivery as incident
    if (deliveryId) {
      await supabase.from('deliveries').update({ status: 'incident' }).eq('id', deliveryId)
    }

    setSaving(false)
    router.replace('/(driver)')
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="bg-red-50 rounded-2xl p-4 border border-red-200">
        <Text className="text-sm font-semibold text-red-700">
          ⚠ Reporte de incidencia
        </Text>
        <Text className="text-xs text-red-600 mt-1">
          Tu administrador será notificado inmediatamente
        </Text>
      </View>

      {/* Type selector */}
      <View>
        <Text className="text-sm font-semibold text-text-primary mb-3">Tipo de incidencia *</Text>
        <View className="gap-2">
          {INCIDENT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              className={`flex-row items-center gap-3 p-3.5 rounded-xl border ${
                type === t ? 'bg-primary/10 border-primary' : 'bg-surface border-border'
              }`}
            >
              <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${type === t ? 'border-primary' : 'border-border'}`}>
                {type === t && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </View>
              <Text className={`text-sm font-medium ${type === t ? 'text-primary' : 'text-text-primary'}`}>
                {INCIDENT_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View>
        <Text className="text-sm font-semibold text-text-primary mb-2">Descripción</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          className="bg-surface rounded-xl border border-border px-4 py-3 text-sm text-text-primary"
          placeholder="Describe lo que sucedió..."
          placeholderTextColor="#6E6E73"
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />
      </View>

      {/* Photo */}
      <View>
        <Text className="text-sm font-semibold text-text-primary mb-2">Foto de evidencia</Text>
        {photo ? (
          <View>
            <Image source={{ uri: photo }} className="w-full h-40 rounded-xl" resizeMode="cover" />
            <TouchableOpacity onPress={takePhoto} className="mt-2 items-center">
              <Text className="text-primary text-sm">Cambiar foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={takePhoto}
            className="h-24 bg-surface rounded-xl border border-dashed border-border items-center justify-center"
          >
            <Text className="text-3xl mb-1">📸</Text>
            <Text className="text-sm text-text-secondary">Tomar foto</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={saving || !type}
        className={`h-14 rounded-xl items-center justify-center ${type ? 'bg-danger' : 'bg-border'}`}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className={`font-semibold text-base ${type ? 'text-white' : 'text-text-secondary'}`}>
            Reportar incidencia
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

```

### `apps/mobile/app/(driver)/index.tsx`

```tsx
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '~/lib/supabase'
import { DELIVERY_STATUS_LABELS } from '@fleettrack/shared'
import type { Delivery, Route } from '@fleettrack/shared'
import { Siren } from 'lucide-react-native'

const STATUS_COLORS: Record<string, string> = {
  pending:     '#6E6E73',
  in_route:    '#0071E3',
  arrived:     '#FF9F0A',
  in_progress: '#FF9F0A',
  delivered:   '#30D158',
  incident:    '#FF375F',
  returned:    '#BF5AF2',
}

export default function DeliveryListScreen() {
  const router = useRouter()
  const [route, setRoute] = useState<Route | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [checklistRequired, setChecklistRequired] = useState(false)

  async function loadRoute() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!driver) return

    const { data: todayRoute } = await supabase
      .from('routes')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('scheduled_date', today)
      .in('status', ['pending', 'in_progress'])
      .single()

    if (!todayRoute) { setLoading(false); return }
    setRoute(todayRoute)

    // Check if checklist is complete
    const { data: checklistRes } = await supabase
      .from('checklist_responses')
      .select('is_complete')
      .eq('route_id', todayRoute.id)
      .single()

    if (!checklistRes?.is_complete) {
      setChecklistRequired(true)
    }

    const { data: routeDeliveries } = await supabase
      .from('deliveries')
      .select('*, customer:customers(id, name, address, phone)')
      .eq('route_id', todayRoute.id)
      .order('sequence_order')

    setDeliveries(routeDeliveries ?? [])
    setLoading(false)
  }

  useEffect(() => { loadRoute() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await loadRoute()
    setRefreshing(false)
  }

  function handleEmergency() {
    router.push('/(driver)/emergency')
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  if (checklistRequired && route) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="bg-surface rounded-2xl p-6 items-center border border-border shadow-sm">
          <Text className="text-5xl mb-4">📋</Text>
          <Text className="text-lg font-bold text-text-primary mb-2 text-center">
            Checklist requerido
          </Text>
          <Text className="text-sm text-text-secondary text-center mb-6">
            Debes completar el checklist pre-salida antes de iniciar tu ruta.
          </Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(driver)/checklist', params: { routeId: route.id } })}
            className="h-14 bg-primary rounded-xl w-full items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">Completar checklist</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (!route) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-5xl mb-4">📦</Text>
        <Text className="text-lg font-bold text-text-primary mb-2 text-center">
          Sin ruta asignada
        </Text>
        <Text className="text-sm text-text-secondary text-center">
          No tienes entregas programadas para hoy. Contacta a tu administrador.
        </Text>
      </View>
    )
  }

  const completed = deliveries.filter(d => d.status === 'delivered').length
  const total = deliveries.length

  return (
    <View className="flex-1 bg-background">
      {/* Route summary */}
      <View className="bg-surface border-b border-border px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-text-primary">
            {completed}/{total} entregas completadas
          </Text>
          <Text className="text-sm text-text-secondary">
            {Math.round((completed / Math.max(total, 1)) * 100)}%
          </Text>
        </View>
        <View className="h-2 bg-background rounded-full overflow-hidden">
          <View
            className="h-full rounded-full bg-moving"
            style={{ width: `${(completed / Math.max(total, 1)) * 100}%` }}
          />
        </View>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={d => d.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0071E3" />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item: delivery }) => {
          const color = STATUS_COLORS[delivery.status] ?? '#6E6E73'
          const label = DELIVERY_STATUS_LABELS[delivery.status]
          const isActionable = !['delivered', 'returned'].includes(delivery.status)

          return (
            <TouchableOpacity
              onPress={() => isActionable && router.push({ pathname: '/(driver)/delivery/[id]', params: { id: delivery.id } })}
              activeOpacity={isActionable ? 0.7 : 1}
              className={`bg-surface rounded-2xl p-4 border ${isActionable ? 'border-border' : 'border-border/50'} shadow-sm`}
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-base font-semibold text-text-primary">
                    {delivery.customer?.name}
                  </Text>
                  {delivery.customer?.address && (
                    <Text className="text-sm text-text-secondary mt-0.5" numberOfLines={2}>
                      {delivery.customer.address}
                    </Text>
                  )}
                </View>
                <View
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${color}18`, borderColor: `${color}30`, borderWidth: 1 }}
                >
                  <Text className="text-xs font-medium" style={{ color }}>
                    {label}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-4 mt-1">
                {delivery.invoice_number && (
                  <Text className="text-xs text-text-secondary">Fact: {delivery.invoice_number}</Text>
                )}
                <Text className="text-xs text-text-secondary">{delivery.weight_lbs} lbs</Text>
              </View>

              {isActionable && (
                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-xs text-primary font-medium">Toca para gestionar →</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">✅</Text>
            <Text className="text-sm text-text-secondary">Sin entregas en esta ruta</Text>
          </View>
        }
      />

      {/* Emergency FAB */}
      <TouchableOpacity
        onPress={handleEmergency}
        className="absolute bottom-6 right-4 w-14 h-14 bg-danger rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Text className="text-2xl">🚨</Text>
      </TouchableOpacity>
    </View>
  )
}

```

### `apps/mobile/app/_layout.tsx`

```tsx
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

```

### `apps/mobile/babel.config.js`

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  }
}

```

### `apps/mobile/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

```

### `apps/mobile/lib/location.ts`

```ts
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

```

### `apps/mobile/lib/notifications.ts`

```ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotifications(driverId: string): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const token = (await Notifications.getExpoPushTokenAsync()).data

  await supabase
    .from('drivers')
    .update({ push_token: token } as any)
    .eq('id', driverId)

  return token
}

export function sendLocalNotification(title: string, body: string) {
  Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  })
}

```

### `apps/mobile/lib/offline.ts`

```ts
import * as SQLite from 'expo-sqlite'
import { supabase } from './supabase'

const db = SQLite.openDatabaseSync('fleettrack_offline.db')

// Initialize offline storage tables
export function initOfflineDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0
    );
  `)
}

export const offlineQueue = {
  async add(type: string, payload: object) {
    db.runSync(
      'INSERT INTO offline_queue (type, payload, created_at) VALUES (?, ?, ?)',
      [type, JSON.stringify(payload), new Date().toISOString()]
    )
  },

  async getAll() {
    return db.getAllSync<{ id: number; type: string; payload: string }>(
      'SELECT * FROM offline_queue ORDER BY created_at ASC LIMIT 100'
    )
  },

  async remove(id: number) {
    db.runSync('DELETE FROM offline_queue WHERE id = ?', [id])
  },

  async sync() {
    const items = await this.getAll()
    if (items.length === 0) return

    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload)
        let error: unknown = null

        if (item.type === 'location') {
          const result = await supabase.from('locations').insert(payload)
          error = result.error
        } else if (item.type === 'delivery_update') {
          const { id, ...data } = payload
          const result = await supabase.from('deliveries').update(data).eq('id', id)
          error = result.error
        } else if (item.type === 'incident') {
          const result = await supabase.from('incidents').insert(payload)
          error = result.error
        } else if (item.type === 'photo') {
          const result = await supabase.from('delivery_photos').insert(payload)
          error = result.error
        }

        if (!error) {
          await this.remove(item.id)
        }
      } catch {
        // Keep item in queue for next sync
      }
    }
  },
}

```

### `apps/mobile/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)

```

### `apps/mobile/package.json`

```json
{
  "name": "@fleettrack/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "build": "eas build --platform android",
    "build:preview": "eas build --platform android --profile preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "@fleettrack/shared": "workspace:*",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@supabase/supabase-js": "^2.45.4",
    "@tanstack/react-query": "^5.56.2",
    "base64-arraybuffer": "^1.0.2",
    "expo": "~51.0.38",
    "expo-camera": "~15.0.16",
    "expo-file-system": "~17.0.1",
    "expo-image-picker": "~15.0.7",
    "expo-location": "~17.0.1",
    "expo-notifications": "~0.28.19",
    "expo-router": "~3.5.24",
    "expo-secure-store": "~13.0.2",
    "expo-sqlite": "~14.0.6",
    "expo-status-bar": "~1.12.1",
    "expo-task-manager": "~11.8.2",
    "nativewind": "^4.0.1",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "react-native-gesture-handler": "~2.17.1",
    "react-native-maps": "1.14.0",
    "react-native-reanimated": "~3.10.1",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "react-native-signature-canvas": "^4.7.2",
    "zustand": "^5.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "tailwindcss": "^3.4.1",
    "typescript": "~5.3.3"
  }
}

```

### `apps/mobile/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0071E3',
        'primary-dark': '#0062C4',
        surface: '#FFFFFF',
        background: '#F5F5F7',
        'text-primary': '#1D1D1F',
        'text-secondary': '#6E6E73',
        border: '#D2D2D7',
        moving: '#30D158',
        stopped: '#FF9F0A',
        incident: '#FF375F',
        'off-route': '#BF5AF2',
        offline: '#8E8E93',
        success: '#30D158',
        warning: '#FF9F0A',
        danger: '#FF375F',
      },
    },
  },
  plugins: [],
}

```

### `apps/mobile/tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "~/*": ["./*"]
    }
  }
}

```

### `apps/web/.env.local.example`

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-api-key

```

### `apps/web/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}

```

### `apps/web/next.config.ts`

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig

```

### `apps/web/package.json`

```json
{
  "name": "@fleettrack/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@fleettrack/shared": "workspace:*",
    "@supabase/supabase-js": "^2.45.4",
    "@supabase/ssr": "^0.5.1",
    "@tanstack/react-query": "^5.56.2",
    "@tanstack/react-query-devtools": "^5.56.2",
    "@vis.gl/react-google-maps": "^1.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.447.0",
    "next": "15.0.3",
    "next-themes": "^0.4.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.13.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.4",
    "zod": "^3.23.8",
    "zustand": "^5.0.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@tailwindcss/postcss": "^4.0.0",
    "eslint": "^8",
    "eslint-config-next": "15.0.3",
    "tailwindcss": "^4.0.0",
    "typescript": "^5"
  }
}

```

### `apps/web/postcss.config.js`

```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

```

### `apps/web/src/app/(auth)/login/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Truck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Credenciales inválidas')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0071E3] rounded-2xl mb-4 shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">FleetTrack</h1>
          <p className="text-sm text-[#6E6E73] mt-1">Control Logístico Honduras</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-11 px-3 rounded-lg border border-[#D2D2D7] bg-white text-[#1D1D1F] text-sm outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                placeholder="admin@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-11 px-3 rounded-lg border border-[#D2D2D7] bg-white text-[#1D1D1F] text-sm outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white font-medium rounded-lg transition-all text-sm mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#6E6E73] mt-6">
          Solo acceso para administradores autorizados
        </p>
      </div>
    </div>
  )
}

```

### `apps/web/src/app/(dashboard)/alerts/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'
import { AlertsClient } from '@/components/dashboard/AlertsClient'

export default async function AlertsPage() {
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from('alerts')
    .select(`
      *,
      driver:drivers(
        id,
        profile:profiles(full_name, phone),
        truck:trucks(plate)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadCount = alerts?.filter(a => !a.is_read).length ?? 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Alertas</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          {unreadCount} alerta{unreadCount !== 1 ? 's' : ''} sin leer
        </p>
      </div>
      <AlertsClient initialAlerts={alerts ?? []} />
    </div>
  )
}

```

### `apps/web/src/app/(dashboard)/analytics/page.tsx`

```tsx
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

```

### `apps/web/src/app/(dashboard)/deliveries/new/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'
import { NewDeliveryForm } from '@/components/dashboard/NewDeliveryForm'

export default async function NewDeliveryPage() {
  const supabase = await createClient()

  const [{ data: customers }, { data: routes }] = await Promise.all([
    supabase.from('customers').select('id, name, address').eq('is_active', true).order('name'),
    supabase
      .from('routes')
      .select(`
        id, name, scheduled_date, total_weight_lbs, occupancy_pct,
        truck:trucks(id, plate, capacity_lbs),
        driver:drivers(profile:profiles(full_name))
      `)
      .in('status', ['pending', 'in_progress'])
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date'),
  ])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Nueva entrega</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">Asignar una entrega a una ruta existente</p>
      </div>
      <NewDeliveryForm customers={customers ?? []} routes={routes ?? []} />
    </div>
  )
}

```

### `apps/web/src/app/(dashboard)/deliveries/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'
import { DeliveryTable } from '@/components/dashboard/DeliveryTable'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>
}) {
  const supabase = await createClient()
  const { status, date } = await searchParams

  const today = date ?? new Date().toISOString().split('T')[0]

  let query = supabase
    .from('deliveries')
    .select(`
      *,
      customer:customers(id, name, address, lat, lng),
      route:routes(
        id, scheduled_date, status,
        driver:drivers(profile:profiles(full_name)),
        truck:trucks(plate)
      )
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: deliveries } = await query.limit(100)

  const { data: stats } = await supabase
    .from('deliveries')
    .select('status')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  const statusCounts = (stats ?? []).reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1D1D1F]">Entregas</h1>
          <p className="text-sm text-[#6E6E73] mt-0.5">
            {deliveries?.length ?? 0} entregas encontradas
          </p>
        </div>
        <Link
          href="/dashboard/deliveries/new"
          className="flex items-center gap-2 px-4 h-9 bg-[#0071E3] text-white text-sm font-medium rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva entrega
        </Link>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todas', count: stats?.length ?? 0 },
          { key: 'pending', label: 'Pendientes', count: statusCounts.pending ?? 0 },
          { key: 'in_route', label: 'En ruta', count: statusCounts.in_route ?? 0 },
          { key: 'delivered', label: 'Entregadas', count: statusCounts.delivered ?? 0 },
          { key: 'incident', label: 'Incidencias', count: statusCounts.incident ?? 0 },
        ].map(s => (
          <Link
            key={s.key}
            href={`/dashboard/deliveries?status=${s.key}&date=${today}`}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-sm border transition-colors ${
              (status ?? 'all') === s.key
                ? 'bg-[#0071E3] text-white border-[#0071E3]'
                : 'bg-white text-[#1D1D1F] border-[#D2D2D7] hover:border-[#0071E3]'
            }`}
          >
            {s.label}
            <span className={`text-xs font-medium ${(status ?? 'all') === s.key ? 'text-white/80' : 'text-[#6E6E73]'}`}>
              {s.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <DeliveryTable deliveries={deliveries ?? []} />
    </div>
  )
}

```

### `apps/web/src/app/(dashboard)/drivers/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'
import { DriversClient } from '@/components/dashboard/DriversClient'

export default async function DriversPage() {
  const supabase = await createClient()

  const { data: drivers } = await supabase
    .from('drivers')
    .select(`
      *,
      profile:profiles(id, full_name, email, phone, is_active),
      truck:trucks(id, plate, brand, model, capacity_lbs)
    `)
    .order('score', { ascending: false })

  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, plate, brand, model, capacity_lbs')
    .eq('is_active', true)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Motoristas</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          {drivers?.length ?? 0} motoristas registrados
        </p>
      </div>
      <DriversClient initialDrivers={drivers ?? []} trucks={trucks ?? []} />
    </div>
  )
}

```

### `apps/web/src/app/(dashboard)/incidents/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'
import { IncidentsClient } from '@/components/dashboard/IncidentsClient'

export default async function IncidentsPage() {
  const supabase = await createClient()

  const { data: incidents } = await supabase
    .from('incidents')
    .select(`
      *,
      driver:drivers(profile:profiles(full_name)),
      delivery:deliveries(invoice_number, customer:customers(name))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const openCount = incidents?.filter(i => i.status === 'open').length ?? 0

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1D1D1F]">Incidencias</h1>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          {openCount} incidencia{openCount !== 1 ? 's' : ''} abiertas
        </p>
      </div>
      <IncidentsClient initialIncidents={incidents ?? []} />
    </div>
  )
}

```

### `apps/web/src/app/(dashboard)/layout.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav'
import { Header } from '@/components/dashboard/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden">
      {/* Sidebar — visible en lg+ */}
      <Sidebar profile={profile} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header profile={profile} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Bottom nav — visible en mobile/tablet */}
      <MobileBottomNav />
    </div>
  )
}

```

### `apps/web/src/app/(dashboard)/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'
import { RealtimeMap } from '@/components/map/RealtimeMap'
import { AlertPanel } from '@/components/dashboard/AlertPanel'
import { KPICards } from '@/components/dashboard/KPICards'
import { TruckList } from '@/components/dashboard/TruckList'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: activeRoutes },
    { data: recentAlerts },
    { data: kpiData },
  ] = await Promise.all([
    supabase
      .from('routes')
      .select(`
        *,
        driver:drivers(
          id, current_status, score,
          profile:profiles(full_name, phone),
          truck:trucks(plate, capacity_lbs)
        ),
        deliveries(id, status)
      `)
      .eq('scheduled_date', today)
      .in('status', ['pending', 'in_progress']),

    supabase
      .from('alerts')
      .select(`*, driver:drivers(profile:profiles(full_name))`)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase.rpc('get_daily_kpi', { p_date: today }).single(),
  ])

  return (
    <div className="relative h-full flex">
      {/* Left panel — truck list */}
      <div className="hidden lg:flex w-72 xl:w-80 flex-col bg-white border-r border-[#D2D2D7] overflow-hidden">
        <TruckList initialRoutes={activeRoutes ?? []} />
      </div>

      {/* Map — center/main */}
      <div className="flex-1 relative">
        <RealtimeMap initialRoutes={activeRoutes ?? []} />

        {/* KPI overlay — top right */}
        <div className="absolute top-4 right-4 z-10 hidden md:block">
          <KPICards data={kpiData} />
        </div>
      </div>

      {/* Alert panel — right side on xl */}
      {(recentAlerts?.length ?? 0) > 0 && (
        <div className="hidden xl:flex w-72 flex-col bg-white border-l border-[#D2D2D7] overflow-hidden">
          <AlertPanel initialAlerts={recentAlerts ?? []} />
        </div>
      )}
    </div>
  )
}

```

### `apps/web/src/app/globals.css`

```css
@import "tailwindcss";

@theme {
  --color-background: #F5F5F7;
  --color-surface: #FFFFFF;
  --color-primary: #0071E3;
  --color-primary-foreground: #FFFFFF;
  --color-text-primary: #1D1D1F;
  --color-text-secondary: #6E6E73;
  --color-border: #D2D2D7;

  /* Status colors */
  --color-status-moving: #30D158;
  --color-status-stopped: #FF9F0A;
  --color-status-incident: #FF375F;
  --color-status-off-route: #BF5AF2;
  --color-status-offline: #8E8E93;
  --color-status-delivering: #0071E3;

  --color-destructive: #FF375F;
  --color-success: #30D158;
  --color-warning: #FF9F0A;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --radius-card: 12px;
  --radius-button: 8px;
  --radius-badge: 20px;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
  --shadow-overlay: 0 8px 32px rgba(0,0,0,0.12);
  --shadow-dropdown: 0 4px 16px rgba(0,0,0,0.10);
}

* {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

/* Google Maps info window reset */
.gm-style .gm-style-iw-c {
  border-radius: 12px !important;
  box-shadow: var(--shadow-overlay) !important;
}

```

### `apps/web/src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Providers } from '@/components/Providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'FleetTrack — Control Logístico',
  description: 'Sistema de rastreo y control logístico de camiones en tiempo real',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0071E3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}

```

### `apps/web/src/app/page.tsx`

```tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/dashboard')
}

```

### `apps/web/src/components/Providers.tsx`

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

```

### `apps/web/src/components/dashboard/AlertPanel.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SEVERITY_BG, timeAgo } from '@/lib/utils'
import { AlertTriangle, Bell, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Alert } from '@fleettrack/shared'

const ALERT_ICONS: Record<string, string> = {
  inactivity: '⏸',
  delay: '⏱',
  geofence_entry: '📍',
  geofence_exit: '🔔',
  signal_loss: '📶',
  emergency: '🚨',
  overload: '⚖️',
  delivery_late: '🕐',
}

export function AlertPanel({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('alerts-panel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new as Alert
          setAlerts(prev => [newAlert, ...prev])
          toast.warning(newAlert.title, { description: newAlert.message ?? undefined })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markResolved(alertId: string) {
    await supabase
      .from('alerts')
      .update({ is_resolved: true, is_read: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId)

    setAlerts(prev => prev.filter(a => a.id !== alertId))
    toast.success('Alerta resuelta')
  }

  async function markRead(alertId: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alertId)
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a))
  }

  const activeAlerts = alerts.filter(a => !a.is_resolved)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D2D2D7]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#1D1D1F]" />
          <span className="text-sm font-semibold text-[#1D1D1F]">Alertas</span>
        </div>
        {activeAlerts.length > 0 && (
          <span className="px-2 py-0.5 bg-[#FF375F] text-white text-xs font-bold rounded-full">
            {activeAlerts.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#D2D2D7]">
        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <CheckCircle className="w-8 h-8 text-[#30D158] mb-2" />
            <p className="text-sm text-[#6E6E73]">Sin alertas activas</p>
          </div>
        ) : (
          activeAlerts.map(alert => (
            <div
              key={alert.id}
              className={`px-4 py-3 ${!alert.is_read ? 'bg-[#F5F5F7]' : 'bg-white'}`}
              onClick={() => !alert.is_read && markRead(alert.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0 mt-0.5">
                  {ALERT_ICONS[alert.type] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold text-[#1D1D1F] leading-tight">
                      {alert.title}
                    </p>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${SEVERITY_BG[alert.severity]}`}>
                      {alert.severity === 'critical' ? 'Crítica' : alert.severity === 'high' ? 'Alta' : alert.severity === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>

                  {alert.driver && (
                    <p className="text-xs text-[#6E6E73] mt-0.5">
                      {alert.driver.profile?.full_name}
                    </p>
                  )}

                  {alert.message && (
                    <p className="text-xs text-[#6E6E73] mt-1 leading-relaxed">{alert.message}</p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-[#6E6E73]">{timeAgo(alert.created_at)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); markResolved(alert.id) }}
                      className="text-[10px] text-[#0071E3] hover:underline font-medium"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

```

### `apps/web/src/components/dashboard/AlertsClient.tsx`

```tsx
'use client'

import { useState } from 'react'
import { AlertPanel } from './AlertPanel'
import type { Alert } from '@fleettrack/shared'

export function AlertsClient({ initialAlerts }: { initialAlerts: Alert[] }) {
  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden" style={{ minHeight: 400 }}>
      <AlertPanel initialAlerts={initialAlerts} />
    </div>
  )
}

```

### `apps/web/src/components/dashboard/AnalyticsDashboard.tsx`

```tsx
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

```

### `apps/web/src/components/dashboard/DeliveryTable.tsx`

```tsx
'use client'

import { formatDate, DELIVERY_STATUS_COLORS, DELIVERY_STATUS_LABELS, formatWeight } from '@/lib/utils'
import type { Delivery } from '@fleettrack/shared'

export function DeliveryTable({ deliveries }: { deliveries: Delivery[] }) {
  if (deliveries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
        <p className="text-[#6E6E73]">No hay entregas que mostrar</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D2D2D7]">
              {['Factura', 'Cliente', 'Motorista', 'Camión', 'Peso', 'Estado', 'Creado'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6E6E73] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D2D2D7]">
            {deliveries.map(delivery => {
              const color = DELIVERY_STATUS_COLORS[delivery.status]
              const label = DELIVERY_STATUS_LABELS[delivery.status]
              const route = (delivery as any).route

              return (
                <tr key={delivery.id} className="hover:bg-[#F5F5F7] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#6E6E73]">
                    {delivery.invoice_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1D1D1F] max-w-[180px] truncate">
                    {delivery.customer?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#6E6E73] whitespace-nowrap">
                    {route?.driver?.profile?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#6E6E73] whitespace-nowrap">
                    {route?.truck?.plate ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#6E6E73] whitespace-nowrap">
                    {formatWeight(delivery.weight_lbs)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        color,
                        backgroundColor: `${color}12`,
                        borderColor: `${color}30`,
                      }}
                    >
                      {label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6E6E73] text-xs whitespace-nowrap">
                    {formatDate(delivery.created_at, 'dd/MM HH:mm')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

```

### `apps/web/src/components/dashboard/DriversClient.tsx`

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Star } from 'lucide-react'
import type { Driver, Truck } from '@fleettrack/shared'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  off_duty:  { label: 'Sin ruta',     color: '#8E8E93' },
  on_route:  { label: 'En ruta',      color: '#0071E3' },
  delivering:{ label: 'Entregando',   color: '#FF9F0A' },
  stopped:   { label: 'Detenido',     color: '#FF375F' },
  emergency: { label: 'Emergencia',   color: '#FF375F' },
}

export function DriversClient({
  initialDrivers,
  trucks,
}: {
  initialDrivers: Driver[]
  trucks: Truck[]
}) {
  const [drivers, setDrivers] = useState(initialDrivers)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', license_number: '',
    license_expires_at: '', assigned_truck_id: '',
  })
  const [loading, setLoading] = useState(false)

  async function createDriver(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.functions.invoke('create-driver', {
      body: {
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        license_number: formData.license_number,
        license_expires_at: formData.license_expires_at,
        assigned_truck_id: formData.assigned_truck_id || null,
      },
    })

    if (authError) {
      toast.error('Error al crear el motorista')
      setLoading(false)
      return
    }

    toast.success('Motorista creado correctamente')
    setShowForm(false)
    setFormData({ full_name: '', email: '', phone: '', license_number: '', license_expires_at: '', assigned_truck_id: '' })
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 h-9 bg-[#0071E3] text-white text-sm font-medium rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo motorista
        </button>
      </div>

      {showForm && (
        <form onSubmit={createDriver} className="bg-white rounded-xl border border-[#D2D2D7] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#1D1D1F]">Nuevo motorista</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'full_name', label: 'Nombre completo', type: 'text', required: true },
              { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
              { key: 'phone', label: 'Teléfono', type: 'tel', required: false },
              { key: 'license_number', label: 'No. licencia', type: 'text', required: true },
              { key: 'license_expires_at', label: 'Vencimiento licencia', type: 'date', required: true },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{field.label}</label>
                <input
                  type={field.type}
                  required={field.required}
                  value={(formData as any)[field.key]}
                  onChange={e => setFormData(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-[#D2D2D7] text-sm outline-none focus:border-[#0071E3]"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Camión asignado</label>
              <select
                value={formData.assigned_truck_id}
                onChange={e => setFormData(f => ({ ...f, assigned_truck_id: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-[#D2D2D7] text-sm bg-white outline-none focus:border-[#0071E3]"
              >
                <option value="">Sin asignar</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>{t.plate} — {t.brand} {t.model}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-9 border border-[#D2D2D7] rounded-lg text-sm text-[#1D1D1F]">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 h-9 bg-[#0071E3] text-white text-sm font-medium rounded-lg disabled:opacity-60">
              {loading ? 'Creando...' : 'Crear motorista'}
            </button>
          </div>
        </form>
      )}

      {/* Drivers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {drivers.map(driver => {
          const status = STATUS_MAP[driver.current_status] ?? STATUS_MAP.off_duty
          return (
            <div key={driver.id} className="bg-white rounded-xl border border-[#D2D2D7] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-[#F5F5F7] rounded-full flex items-center justify-center font-semibold text-sm text-[#1D1D1F]">
                    {driver.profile?.full_name?.charAt(0) ?? 'M'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1D1D1F]">{driver.profile?.full_name}</p>
                    <p className="text-xs text-[#6E6E73]">{driver.profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-[#FF9F0A] fill-[#FF9F0A]" />
                  <span className="text-xs font-semibold text-[#1D1D1F]">{driver.score?.toFixed(0)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6E6E73]">Estado</span>
                  <span className="font-medium" style={{ color: status.color }}>{status.label}</span>
                </div>
                {driver.truck && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6E6E73]">Camión</span>
                    <span className="text-[#1D1D1F] font-medium">{driver.truck.plate}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-[#6E6E73]">Licencia</span>
                  <span className="text-[#1D1D1F]">{driver.license_number}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

```

### `apps/web/src/components/dashboard/Header.tsx`

```tsx
'use client'

import { Bell, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@fleettrack/shared'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Mapa en vivo',
  '/dashboard/deliveries': 'Entregas',
  '/dashboard/drivers': 'Motoristas',
  '/dashboard/alerts': 'Alertas',
  '/dashboard/incidents': 'Incidencias',
  '/dashboard/analytics': 'Analíticas',
}

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function loadCount() {
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_resolved', false)
      setUnreadAlerts(count ?? 0)
    }

    loadCount()

    const channel = supabase
      .channel('alerts-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        setUnreadAlerts(prev => prev + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const title = PAGE_TITLES[pathname] ?? 'FleetTrack'

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-[#D2D2D7] shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu icon — functional with MobileBottomNav */}
        <button className="lg:hidden p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73]">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-[#1D1D1F] text-sm">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Alerts bell */}
        <Link href="/dashboard/alerts" className="relative p-2 rounded-lg hover:bg-[#F5F5F7] transition-colors">
          <Bell className="w-5 h-5 text-[#6E6E73]" />
          {unreadAlerts > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF375F] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadAlerts > 9 ? '9+' : unreadAlerts}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <div className="w-7 h-7 bg-[#0071E3]/10 rounded-full flex items-center justify-center">
          <span className="text-xs font-semibold text-[#0071E3]">
            {profile.full_name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  )
}

```

### `apps/web/src/components/dashboard/IncidentsClient.tsx`

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { INCIDENT_LABELS } from '@fleettrack/shared'
import type { Incident } from '@fleettrack/shared'
import Image from 'next/image'

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  open:      { label: 'Abierta',    className: 'bg-red-50 text-red-700 border-red-200' },
  reviewing: { label: 'Revisando',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved:  { label: 'Resuelta',   className: 'bg-green-50 text-green-700 border-green-200' },
  escalated: { label: 'Escalada',   className: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export function IncidentsClient({ initialIncidents }: { initialIncidents: Incident[] }) {
  const [incidents, setIncidents] = useState(initialIncidents)
  const [selected, setSelected] = useState<Incident | null>(null)
  const [notes, setNotes] = useState('')

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('incidents')
      .update({
        status,
        admin_notes: notes || undefined,
        resolved_at: status === 'resolved' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)

    if (error) { toast.error('Error al actualizar'); return }

    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: status as any, admin_notes: notes } : i))
    setSelected(null)
    toast.success('Incidencia actualizada')
  }

  return (
    <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D2D2D7]">
              {['Motorista', 'Tipo', 'Entrega', 'Estado', 'Fecha', 'Acción'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6E6E73]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D2D2D7]">
            {incidents.map(inc => {
              const style = STATUS_STYLE[inc.status] ?? STATUS_STYLE.open
              const delivery = (inc as any).delivery
              return (
                <tr key={inc.id} className="hover:bg-[#F5F5F7] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1D1D1F]">
                    {inc.driver?.profile?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#6E6E73]">
                    {INCIDENT_LABELS[inc.type]}
                  </td>
                  <td className="px-4 py-3 text-[#6E6E73] text-xs">
                    {delivery?.customer?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${style.className}`}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6E6E73] text-xs whitespace-nowrap">
                    {formatDate(inc.created_at, 'dd/MM HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    {inc.status !== 'resolved' && (
                      <button
                        onClick={() => { setSelected(inc); setNotes(inc.admin_notes ?? '') }}
                        className="text-xs text-[#0071E3] hover:underline font-medium"
                      >
                        Gestionar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-[#1D1D1F] mb-1">Gestionar incidencia</h3>
            <p className="text-sm text-[#6E6E73] mb-4">{INCIDENT_LABELS[selected.type]} — {selected.driver?.profile?.full_name}</p>

            {selected.description && (
              <div className="bg-[#F5F5F7] rounded-lg p-3 mb-4">
                <p className="text-xs text-[#6E6E73] mb-1">Descripción del motorista</p>
                <p className="text-sm text-[#1D1D1F]">{selected.description}</p>
              </div>
            )}

            {selected.photo_url && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <Image src={selected.photo_url} alt="Foto incidencia" width={400} height={200} className="w-full object-cover max-h-48" />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Notas del administrador</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[#D2D2D7] text-sm resize-none outline-none focus:border-[#0071E3]"
                placeholder="Agregar notas..."
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSelected(null)} className="flex-1 h-9 border border-[#D2D2D7] rounded-lg text-sm">Cancelar</button>
              <button onClick={() => updateStatus(selected.id, 'reviewing')} className="flex-1 h-9 bg-amber-500 text-white rounded-lg text-sm">Revisar</button>
              <button onClick={() => updateStatus(selected.id, 'resolved')} className="flex-1 h-9 bg-[#30D158] text-white rounded-lg text-sm font-medium">Resolver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

```

### `apps/web/src/components/dashboard/KPICards.tsx`

```tsx
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

```

### `apps/web/src/components/dashboard/MobileBottomNav.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Package, Users, Bell, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', icon: Map, label: 'Mapa' },
  { href: '/dashboard/deliveries', icon: Package, label: 'Entregas' },
  { href: '/dashboard/drivers', icon: Users, label: 'Motoristas' },
  { href: '/dashboard/alerts', icon: Bell, label: 'Alertas' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analíticas' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#D2D2D7] flex safe-area-bottom z-20">
      {items.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-[#0071E3]' : 'text-[#6E6E73]'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive && 'text-[#0071E3]')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

```

### `apps/web/src/components/dashboard/NewDeliveryForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatWeight } from '@/lib/utils'

interface Customer { id: string; name: string; address?: string }
interface RouteOption {
  id: string
  name?: string
  scheduled_date: string
  total_weight_lbs: number
  occupancy_pct: number
  truck: { id: string; plate: string; capacity_lbs: number } | null
  driver: { profile: { full_name: string } | null } | null
}

export function NewDeliveryForm({
  customers,
  routes,
}: {
  customers: Customer[]
  routes: RouteOption[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    invoice_number: '',
    weight_lbs: '',
    route_id: '',
    notes: '',
  })

  const selectedRoute = routes.find(r => r.id === form.route_id)
  const newWeight = Number(form.weight_lbs) || 0
  const projectedWeight = (selectedRoute?.total_weight_lbs ?? 0) + newWeight
  const capacity = selectedRoute?.truck?.capacity_lbs ?? 0
  const projectedOccupancy = capacity > 0 ? (projectedWeight / capacity) * 100 : 0
  const isOverCapacity = capacity > 0 && projectedWeight > capacity

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isOverCapacity) {
      toast.error('El peso excede la capacidad del camión')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('deliveries').insert({
      customer_id: form.customer_id,
      invoice_number: form.invoice_number || null,
      weight_lbs: newWeight,
      route_id: form.route_id || null,
      notes: form.notes || null,
      status: 'pending',
    })

    if (error) {
      toast.error('Error al crear la entrega')
      setLoading(false)
      return
    }

    if (form.route_id && selectedRoute) {
      await supabase.from('routes').update({
        total_weight_lbs: projectedWeight,
        occupancy_pct: projectedOccupancy,
      }).eq('id', form.route_id)
    }

    toast.success('Entrega creada correctamente')
    router.push('/dashboard/deliveries')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#D2D2D7] p-6 space-y-5">
      {/* Customer */}
      <div>
        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Cliente *</label>
        <select
          value={form.customer_id}
          onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
          required
          className="w-full h-11 px-3 rounded-lg border border-[#D2D2D7] text-sm text-[#1D1D1F] bg-white outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
        >
          <option value="">Seleccionar cliente...</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Invoice */}
      <div>
        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Número de factura</label>
        <input
          type="text"
          value={form.invoice_number}
          onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
          className="w-full h-11 px-3 rounded-lg border border-[#D2D2D7] text-sm text-[#1D1D1F] bg-white outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
          placeholder="Ej: FAC-2024-001"
        />
      </div>

      {/* Weight */}
      <div>
        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Peso (libras) *</label>
        <input
          type="number"
          value={form.weight_lbs}
          onChange={e => setForm(f => ({ ...f, weight_lbs: e.target.value }))}
          required
          min="0.1"
          step="0.1"
          className="w-full h-11 px-3 rounded-lg border border-[#D2D2D7] text-sm text-[#1D1D1F] bg-white outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
          placeholder="0"
        />
      </div>

      {/* Route */}
      <div>
        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Asignar a ruta</label>
        <select
          value={form.route_id}
          onChange={e => setForm(f => ({ ...f, route_id: e.target.value }))}
          className="w-full h-11 px-3 rounded-lg border border-[#D2D2D7] text-sm text-[#1D1D1F] bg-white outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
        >
          <option value="">Sin ruta asignada</option>
          {routes.map(r => (
            <option key={r.id} value={r.id}>
              {r.driver?.profile?.full_name} — {r.truck?.plate} — {r.scheduled_date} ({Math.round(r.occupancy_pct)}% ocupado)
            </option>
          ))}
        </select>

        {/* Capacity indicator */}
        {selectedRoute && form.weight_lbs && (
          <div className="mt-3 p-3 rounded-lg bg-[#F5F5F7] border border-[#D2D2D7]">
            <div className="flex justify-between text-xs text-[#6E6E73] mb-1.5">
              <span>Ocupación proyectada</span>
              <span className={isOverCapacity ? 'text-[#FF375F] font-semibold' : 'text-[#1D1D1F] font-semibold'}>
                {projectedOccupancy.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#D2D2D7] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(projectedOccupancy, 100)}%`,
                  backgroundColor: isOverCapacity ? '#FF375F' : projectedOccupancy > 90 ? '#FF9F0A' : '#30D158',
                }}
              />
            </div>
            <p className="text-xs text-[#6E6E73] mt-1.5">
              {formatWeight(projectedWeight)} / {formatWeight(capacity)}
            </p>
            {isOverCapacity && (
              <p className="text-xs text-[#FF375F] font-medium mt-1">
                ⚠ Excede la capacidad del camión
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Notas</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-[#D2D2D7] text-sm text-[#1D1D1F] bg-white outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 resize-none"
          placeholder="Instrucciones especiales..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 h-11 border border-[#D2D2D7] rounded-lg text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || isOverCapacity}
          className="flex-1 h-11 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {loading ? 'Guardando...' : 'Crear entrega'}
        </button>
      </div>
    </form>
  )
}

```

### `apps/web/src/components/dashboard/Sidebar.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Package, Users, Bell, BarChart3, AlertTriangle, Truck, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@fleettrack/shared'

const navItems = [
  { href: '/dashboard', icon: Map, label: 'Mapa en vivo' },
  { href: '/dashboard/deliveries', icon: Package, label: 'Entregas' },
  { href: '/dashboard/drivers', icon: Users, label: 'Motoristas' },
  { href: '/dashboard/alerts', icon: Bell, label: 'Alertas' },
  { href: '/dashboard/incidents', icon: AlertTriangle, label: 'Incidencias' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analíticas' },
]

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex w-56 xl:w-60 flex-col bg-white border-r border-[#D2D2D7] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[#D2D2D7]">
        <div className="w-7 h-7 bg-[#0071E3] rounded-lg flex items-center justify-center shrink-0">
          <Truck className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-[#1D1D1F] text-sm">FleetTrack</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-[#D2D2D7]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 bg-[#F5F5F7] rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-[#1D1D1F]">
              {profile.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1D1D1F] truncate">{profile.full_name}</p>
            <p className="text-xs text-[#6E6E73] truncate">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 h-8 rounded-lg text-xs text-[#6E6E73] hover:text-[#FF375F] hover:bg-red-50 transition-colors mt-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

```

### `apps/web/src/components/dashboard/TruckList.tsx`

```tsx
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

```

### `apps/web/src/components/map/RealtimeMap.tsx`

```tsx
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

```

### `apps/web/src/components/map/TruckMarker.tsx`

```tsx
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

```

### `apps/web/src/hooks/useRealtimeTracking.ts`

```ts
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

```

### `apps/web/src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

```

### `apps/web/src/lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

```

### `apps/web/src/lib/utils.ts`

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TruckStatus, AlertSeverity, DeliveryStatus } from '@fleettrack/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy HH:mm') {
  return format(new Date(date), pattern, { locale: es })
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatWeight(lbs: number) {
  return `${lbs.toLocaleString('es-HN')} lbs`
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

export const STATUS_COLORS: Record<TruckStatus, string> = {
  moving: '#30D158',
  stopped: '#FF9F0A',
  delivering: '#0071E3',
  off_route: '#BF5AF2',
  offline: '#8E8E93',
}

export const STATUS_LABELS: Record<TruckStatus, string> = {
  moving: 'En movimiento',
  stopped: 'Detenido',
  delivering: 'En entrega',
  off_route: 'Fuera de ruta',
  offline: 'Sin señal',
}

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  low: '#30D158',
  medium: '#FF9F0A',
  high: '#FF375F',
  critical: '#FF375F',
}

export const SEVERITY_BG: Record<AlertSeverity, string> = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-100 text-red-800 border-red-300',
}

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: '#6E6E73',
  in_route: '#0071E3',
  arrived: '#FF9F0A',
  in_progress: '#FF9F0A',
  delivered: '#30D158',
  incident: '#FF375F',
  returned: '#BF5AF2',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendiente',
  in_route: 'En ruta',
  arrived: 'Llegó',
  in_progress: 'En descarga',
  delivered: 'Entregado',
  incident: 'Incidencia',
  returned: 'Devuelto',
}

```

### `apps/web/src/middleware.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login')
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname === '/'

  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

```

### `apps/web/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

### `package.json`

```json
{
  "name": "fleettrack-honduras",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.1.3",
    "typescript": "^5.6.2"
  },
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20"
  }
}

```

### `packages/shared/package.json`

```json
{
  "name": "@fleettrack/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}

```

### `packages/shared/src/index.ts`

```ts
export * from './types/index'

```

### `packages/shared/src/types/index.ts`

```ts
export type UserRole = 'admin' | 'driver'
export type DriverStatus = 'off_duty' | 'on_route' | 'delivering' | 'stopped' | 'emergency'
export type TruckStatus = 'moving' | 'stopped' | 'delivering' | 'off_route' | 'offline'
export type DeliveryStatus = 'pending' | 'in_route' | 'arrived' | 'in_progress' | 'delivered' | 'incident' | 'returned'
export type RouteStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertType = 'inactivity' | 'delay' | 'geofence_entry' | 'geofence_exit' | 'signal_loss' | 'emergency' | 'overload' | 'delivery_late'
export type IncidentType = 'traffic' | 'accident' | 'vehicle_issue' | 'customer_absent' | 'wrong_address' | 'product_damage' | 'inactivity' | 'emergency' | 'other'
export type IncidentStatus = 'open' | 'reviewing' | 'resolved' | 'escalated'
export type PhotoType = 'delivery' | 'incident' | 'checklist' | 'damage'
export type GeofenceType = 'warehouse' | 'customer' | 'zone'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Truck {
  id: string
  plate: string
  brand: string
  model: string
  year?: number
  capacity_lbs: number
  fuel_type: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  profile_id: string
  license_number: string
  license_expires_at: string
  assigned_truck_id?: string
  current_status: DriverStatus
  score: number
  created_at: string
  updated_at: string
  profile?: Profile
  truck?: Truck
}

export interface Customer {
  id: string
  name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  lat?: number
  lng?: number
  notes?: string
  incident_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Geofence {
  id: string
  name: string
  type: GeofenceType
  lat: number
  lng: number
  radius_m: number
  customer_id?: string
  is_active: boolean
  created_at: string
}

export interface Route {
  id: string
  name?: string
  driver_id?: string
  truck_id?: string
  scheduled_date: string
  status: RouteStatus
  total_weight_lbs: number
  occupancy_pct: number
  started_at?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
  driver?: Driver
  truck?: Truck
  deliveries?: Delivery[]
}

export interface Delivery {
  id: string
  route_id?: string
  customer_id: string
  invoice_number?: string
  weight_lbs: number
  status: DeliveryStatus
  sequence_order: number
  arrived_at?: string
  delivery_started_at?: string
  delivered_at?: string
  time_limit_minutes: number
  requires_auth: boolean
  authorized_by?: string
  authorized_at?: string
  notes?: string
  customer_signature_url?: string
  created_at: string
  updated_at: string
  customer?: Customer
  photos?: DeliveryPhoto[]
}

export interface Location {
  id: string
  driver_id: string
  truck_id?: string
  route_id?: string
  lat: number
  lng: number
  speed_kmh: number
  heading?: number
  accuracy_m?: number
  battery_pct?: number
  is_online: boolean
  recorded_at: string
}

export interface Incident {
  id: string
  delivery_id?: string
  driver_id: string
  route_id?: string
  type: IncidentType
  description?: string
  photo_url?: string
  lat?: number
  lng?: number
  status: IncidentStatus
  resolved_by?: string
  resolved_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  driver?: Driver
  delivery?: Delivery
}

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  driver_id?: string
  route_id?: string
  delivery_id?: string
  title: string
  message?: string
  is_read: boolean
  is_resolved: boolean
  resolved_by?: string
  resolved_at?: string
  metadata: Record<string, unknown>
  created_at: string
  driver?: Driver
}

export interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

export interface ChecklistTemplate {
  id: string
  name: string
  items: ChecklistItem[]
  is_active: boolean
  created_at: string
}

export interface ChecklistResponse {
  id: string
  template_id?: string
  route_id: string
  driver_id: string
  responses: Record<string, boolean>
  is_complete: boolean
  completed_at?: string
  created_at: string
}

export interface DeliveryPhoto {
  id: string
  delivery_id: string
  driver_id: string
  photo_url: string
  photo_type: PhotoType
  lat?: number
  lng?: number
  taken_at: string
}

export interface DriverScore {
  id: string
  driver_id: string
  route_id?: string
  date: string
  punctuality_score: number
  incident_score: number
  avg_delivery_time_min?: number
  route_compliance_score: number
  overall_score: number
  deliveries_count: number
  incidents_count: number
  late_deliveries_count: number
  created_at: string
  driver?: Driver
}

// Client-side real-time state
export interface TruckRealtime {
  driver_id: string
  truck_id?: string
  driver_name: string
  truck_plate?: string
  lat: number
  lng: number
  speed_kmh: number
  heading?: number
  battery_pct?: number
  is_online: boolean
  last_seen: string
  status: TruckStatus
  current_delivery?: {
    id: string
    customer_name: string
    status: DeliveryStatus
  }
}

export interface KPIData {
  total_deliveries: number
  completed_deliveries: number
  pending_deliveries: number
  active_routes: number
  active_drivers: number
  total_incidents: number
  avg_delivery_time_min: number
  completion_rate: number
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  traffic: 'Tráfico',
  accident: 'Accidente',
  vehicle_issue: 'Problema de vehículo',
  customer_absent: 'Cliente ausente',
  wrong_address: 'Dirección incorrecta',
  product_damage: 'Daño en producto',
  inactivity: 'Inactividad',
  emergency: 'Emergencia',
  other: 'Otro',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendiente',
  in_route: 'En ruta',
  arrived: 'Llegó',
  in_progress: 'En descarga',
  delivered: 'Entregado',
  incident: 'Incidencia',
  returned: 'Devuelto',
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"

```

### `supabase/schema.sql`

```sql
-- ============================================================
-- FleetTrack Honduras — Schema completo
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ── PROFILES (extiende auth.users) ──────────────────────────
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── TRUCKS ──────────────────────────────────────────────────
CREATE TABLE public.trucks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate         TEXT NOT NULL UNIQUE,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          INTEGER,
  capacity_lbs  NUMERIC(10,2) NOT NULL,
  fuel_type     TEXT DEFAULT 'diesel',
  is_active     BOOLEAN DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── DRIVERS ─────────────────────────────────────────────────
CREATE TABLE public.drivers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  license_number     TEXT NOT NULL UNIQUE,
  license_expires_at DATE NOT NULL,
  assigned_truck_id  UUID REFERENCES public.trucks(id),
  current_status     TEXT DEFAULT 'off_duty'
                     CHECK (current_status IN ('off_duty','on_route','delivering','stopped','emergency')),
  score              NUMERIC(5,2) DEFAULT 100.00,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE public.customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  contact_name   TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  lat            NUMERIC(10,8),
  lng            NUMERIC(11,8),
  notes          TEXT,
  incident_count INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── GEOFENCES ───────────────────────────────────────────────
CREATE TABLE public.geofences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('warehouse','customer','zone')),
  lat         NUMERIC(10,8) NOT NULL,
  lng         NUMERIC(11,8) NOT NULL,
  radius_m    INTEGER NOT NULL DEFAULT 200,
  customer_id UUID REFERENCES public.customers(id),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ROUTES ──────────────────────────────────────────────────
CREATE TABLE public.routes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT,
  driver_id        UUID REFERENCES public.drivers(id),
  truck_id         UUID REFERENCES public.trucks(id),
  scheduled_date   DATE NOT NULL,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed','cancelled')),
  total_weight_lbs NUMERIC(10,2) DEFAULT 0,
  occupancy_pct    NUMERIC(5,2) DEFAULT 0,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── DELIVERIES ──────────────────────────────────────────────
CREATE TABLE public.deliveries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id             UUID REFERENCES public.routes(id),
  customer_id          UUID REFERENCES public.customers(id) NOT NULL,
  invoice_number       TEXT,
  weight_lbs           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status               TEXT DEFAULT 'pending'
                       CHECK (status IN ('pending','in_route','arrived','in_progress','delivered','incident','returned')),
  sequence_order       INTEGER DEFAULT 0,
  arrived_at           TIMESTAMPTZ,
  delivery_started_at  TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  time_limit_minutes   INTEGER DEFAULT 120,
  requires_auth        BOOLEAN DEFAULT false,
  authorized_by        UUID REFERENCES public.profiles(id),
  authorized_at        TIMESTAMPTZ,
  notes                TEXT,
  customer_signature_url TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ── LOCATIONS (GPS trail) ────────────────────────────────────
CREATE TABLE public.locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID REFERENCES public.drivers(id) NOT NULL,
  truck_id    UUID REFERENCES public.trucks(id),
  route_id    UUID REFERENCES public.routes(id),
  lat         NUMERIC(10,8) NOT NULL,
  lng         NUMERIC(11,8) NOT NULL,
  speed_kmh   NUMERIC(6,2) DEFAULT 0,
  heading     NUMERIC(5,2),
  accuracy_m  NUMERIC(8,2),
  battery_pct INTEGER,
  is_online   BOOLEAN DEFAULT true,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- ── EVENTS ──────────────────────────────────────────────────
CREATE TABLE public.events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  driver_id   UUID REFERENCES public.drivers(id),
  truck_id    UUID REFERENCES public.trucks(id),
  route_id    UUID REFERENCES public.routes(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  lat         NUMERIC(10,8),
  lng         NUMERIC(11,8),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── INCIDENTS ───────────────────────────────────────────────
CREATE TABLE public.incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id),
  driver_id   UUID REFERENCES public.drivers(id) NOT NULL,
  route_id    UUID REFERENCES public.routes(id),
  type        TEXT NOT NULL
              CHECK (type IN ('traffic','accident','vehicle_issue','customer_absent',
                              'wrong_address','product_damage','inactivity','emergency','other')),
  description TEXT,
  photo_url   TEXT,
  lat         NUMERIC(10,8),
  lng         NUMERIC(11,8),
  status      TEXT DEFAULT 'open'
              CHECK (status IN ('open','reviewing','resolved','escalated')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ALERTS ──────────────────────────────────────────────────
CREATE TABLE public.alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  severity    TEXT DEFAULT 'medium'
              CHECK (severity IN ('low','medium','high','critical')),
  driver_id   UUID REFERENCES public.drivers(id),
  route_id    UUID REFERENCES public.routes(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  title       TEXT NOT NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── CHECKLIST TEMPLATES ─────────────────────────────────────
CREATE TABLE public.checklist_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  items      JSONB NOT NULL DEFAULT '[]',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── CHECKLIST RESPONSES ─────────────────────────────────────
CREATE TABLE public.checklist_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID REFERENCES public.checklist_templates(id),
  route_id     UUID REFERENCES public.routes(id) NOT NULL,
  driver_id    UUID REFERENCES public.drivers(id) NOT NULL,
  responses    JSONB NOT NULL DEFAULT '{}',
  is_complete  BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── DELIVERY PHOTOS ─────────────────────────────────────────
CREATE TABLE public.delivery_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) NOT NULL,
  driver_id   UUID REFERENCES public.drivers(id) NOT NULL,
  photo_url   TEXT NOT NULL,
  photo_type  TEXT DEFAULT 'delivery'
              CHECK (photo_type IN ('delivery','incident','checklist','damage')),
  lat         NUMERIC(10,8),
  lng         NUMERIC(11,8),
  taken_at    TIMESTAMPTZ DEFAULT now()
);

-- ── DRIVER SCORES ───────────────────────────────────────────
CREATE TABLE public.driver_scores (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id                UUID REFERENCES public.drivers(id) NOT NULL,
  route_id                 UUID REFERENCES public.routes(id),
  date                     DATE NOT NULL,
  punctuality_score        NUMERIC(5,2) DEFAULT 100,
  incident_score           NUMERIC(5,2) DEFAULT 100,
  avg_delivery_time_min    NUMERIC(8,2),
  route_compliance_score   NUMERIC(5,2) DEFAULT 100,
  overall_score            NUMERIC(5,2) DEFAULT 100,
  deliveries_count         INTEGER DEFAULT 0,
  incidents_count          INTEGER DEFAULT 0,
  late_deliveries_count    INTEGER DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_locations_driver_recorded ON public.locations(driver_id, recorded_at DESC);
CREATE INDEX idx_locations_recorded_at ON public.locations(recorded_at DESC);
CREATE INDEX idx_deliveries_route ON public.deliveries(route_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_customer ON public.deliveries(customer_id);
CREATE INDEX idx_events_driver ON public.events(driver_id, created_at DESC);
CREATE INDEX idx_events_route ON public.events(route_id);
CREATE INDEX idx_alerts_unread ON public.alerts(is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_alerts_driver ON public.alerts(driver_id);
CREATE INDEX idx_incidents_driver ON public.incidents(driver_id);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_routes_scheduled ON public.routes(scheduled_date);
CREATE INDEX idx_routes_status ON public.routes(status);
CREATE INDEX idx_driver_scores_driver ON public.driver_scores(driver_id, date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_scores ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get driver id for current user
CREATE OR REPLACE FUNCTION public.my_driver_id()
RETURNS UUID AS $$
  SELECT id FROM public.drivers WHERE profile_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "users_own_profile" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin_manage_profiles" ON public.profiles
  FOR ALL USING (public.is_admin());
CREATE POLICY "user_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- TRUCKS policies
CREATE POLICY "authenticated_read_trucks" ON public.trucks
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_trucks" ON public.trucks
  FOR ALL USING (public.is_admin());

-- DRIVERS policies
CREATE POLICY "admin_manage_drivers" ON public.drivers
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own" ON public.drivers
  FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "driver_update_own_status" ON public.drivers
  FOR UPDATE USING (profile_id = auth.uid());

-- CUSTOMERS policies
CREATE POLICY "authenticated_read_customers" ON public.customers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_customers" ON public.customers
  FOR ALL USING (public.is_admin());

-- GEOFENCES policies
CREATE POLICY "authenticated_read_geofences" ON public.geofences
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_geofences" ON public.geofences
  FOR ALL USING (public.is_admin());

-- ROUTES policies
CREATE POLICY "admin_manage_routes" ON public.routes
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_routes" ON public.routes
  FOR SELECT USING (driver_id = public.my_driver_id());
CREATE POLICY "driver_update_own_route" ON public.routes
  FOR UPDATE USING (driver_id = public.my_driver_id());

-- DELIVERIES policies
CREATE POLICY "admin_manage_deliveries" ON public.deliveries
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_deliveries" ON public.deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_id AND r.driver_id = public.my_driver_id()
    )
  );
CREATE POLICY "driver_update_own_deliveries" ON public.deliveries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_id AND r.driver_id = public.my_driver_id()
    )
  );

-- LOCATIONS policies
CREATE POLICY "admin_read_all_locations" ON public.locations
  FOR SELECT USING (public.is_admin());
CREATE POLICY "driver_insert_own_location" ON public.locations
  FOR INSERT WITH CHECK (driver_id = public.my_driver_id());
CREATE POLICY "driver_read_own_locations" ON public.locations
  FOR SELECT USING (driver_id = public.my_driver_id());

-- EVENTS policies
CREATE POLICY "admin_read_all_events" ON public.events
  FOR SELECT USING (public.is_admin());
CREATE POLICY "driver_insert_own_events" ON public.events
  FOR INSERT WITH CHECK (driver_id = public.my_driver_id());
CREATE POLICY "driver_read_own_events" ON public.events
  FOR SELECT USING (driver_id = public.my_driver_id());

-- INCIDENTS policies
CREATE POLICY "admin_manage_incidents" ON public.incidents
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_insert_own_incidents" ON public.incidents
  FOR INSERT WITH CHECK (driver_id = public.my_driver_id());
CREATE POLICY "driver_read_own_incidents" ON public.incidents
  FOR SELECT USING (driver_id = public.my_driver_id());

-- ALERTS policies
CREATE POLICY "admin_manage_alerts" ON public.alerts
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_alerts" ON public.alerts
  FOR SELECT USING (driver_id = public.my_driver_id());

-- CHECKLIST policies
CREATE POLICY "authenticated_read_templates" ON public.checklist_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_templates" ON public.checklist_templates
  FOR ALL USING (public.is_admin());

CREATE POLICY "driver_manage_own_checklist" ON public.checklist_responses
  FOR ALL USING (driver_id = public.my_driver_id());
CREATE POLICY "admin_read_checklist_responses" ON public.checklist_responses
  FOR SELECT USING (public.is_admin());

-- DELIVERY PHOTOS policies
CREATE POLICY "admin_read_all_photos" ON public.delivery_photos
  FOR SELECT USING (public.is_admin());
CREATE POLICY "driver_manage_own_photos" ON public.delivery_photos
  FOR ALL USING (driver_id = public.my_driver_id());

-- DRIVER SCORES policies
CREATE POLICY "admin_manage_scores" ON public.driver_scores
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_scores" ON public.driver_scores
  FOR SELECT USING (driver_id = public.my_driver_id());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_trucks_updated_at BEFORE UPDATE ON public.trucks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Geofence check on new location insert
CREATE OR REPLACE FUNCTION public.check_geofence_on_location()
RETURNS TRIGGER AS $$
DECLARE
  geofence_rec RECORD;
  distance_m   FLOAT;
BEGIN
  FOR geofence_rec IN
    SELECT * FROM public.geofences WHERE is_active = true
  LOOP
    distance_m := 111320 * sqrt(
      power(NEW.lat - geofence_rec.lat, 2) +
      power((NEW.lng - geofence_rec.lng) * cos(radians(NEW.lat)), 2)
    );

    IF distance_m <= geofence_rec.radius_m THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.events
        WHERE driver_id = NEW.driver_id
          AND type = 'geofence_enter_' || geofence_rec.id::text
          AND created_at > now() - INTERVAL '10 minutes'
      ) THEN
        INSERT INTO public.events (type, driver_id, truck_id, route_id, lat, lng, metadata)
        VALUES (
          'geofence_enter',
          NEW.driver_id,
          NEW.truck_id,
          NEW.route_id,
          NEW.lat,
          NEW.lng,
          jsonb_build_object('geofence_id', geofence_rec.id, 'geofence_name', geofence_rec.name, 'geofence_type', geofence_rec.type)
        );

        INSERT INTO public.alerts (type, severity, driver_id, route_id, title, message)
        VALUES (
          'geofence_entry',
          'low',
          NEW.driver_id,
          NEW.route_id,
          'Entrada: ' || geofence_rec.name,
          'El motorista ingresó a ' || geofence_rec.name
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_geofence_after_location
  AFTER INSERT ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.check_geofence_on_location();

-- Inactivity detection (called by pg_cron every 5 minutes)
CREATE OR REPLACE FUNCTION public.check_driver_inactivity()
RETURNS void AS $$
DECLARE
  driver_rec RECORD;
BEGIN
  FOR driver_rec IN
    SELECT DISTINCT ON (d.id)
      d.id AS driver_id,
      r.id AS route_id,
      l.recorded_at AS last_seen
    FROM public.drivers d
    JOIN public.routes r ON r.driver_id = d.id AND r.status = 'in_progress'
    JOIN public.locations l ON l.driver_id = d.id
    WHERE d.current_status = 'on_route'
    ORDER BY d.id, l.recorded_at DESC
  LOOP
    IF driver_rec.last_seen < now() - INTERVAL '20 minutes' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE driver_id = driver_rec.driver_id
          AND type = 'inactivity'
          AND is_resolved = false
          AND created_at > now() - INTERVAL '30 minutes'
      ) THEN
        INSERT INTO public.alerts (type, severity, driver_id, route_id, title, message)
        VALUES (
          'inactivity',
          'high',
          driver_rec.driver_id,
          driver_rec.route_id,
          'Motorista detenido +20 minutos',
          'El motorista no ha enviado ubicación en más de 20 minutos'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate driver score after route completion
CREATE OR REPLACE FUNCTION public.calculate_route_score(p_route_id UUID)
RETURNS void AS $$
DECLARE
  route_rec    RECORD;
  score_data   RECORD;
  punct_score  NUMERIC;
  inc_score    NUMERIC;
  comp_score   NUMERIC;
  overall      NUMERIC;
BEGIN
  SELECT r.*, d.id AS driver_id
  INTO route_rec
  FROM public.routes r
  JOIN public.drivers d ON d.id = r.driver_id
  WHERE r.id = p_route_id;

  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
    COUNT(*) FILTER (WHERE delivered_at > arrived_at + (time_limit_minutes || ' minutes')::INTERVAL) AS late,
    AVG(EXTRACT(EPOCH FROM (delivered_at - arrived_at)) / 60) FILTER (WHERE status = 'delivered') AS avg_minutes
  INTO score_data
  FROM public.deliveries
  WHERE route_id = p_route_id;

  punct_score := GREATEST(0, 100 - (COALESCE(score_data.late, 0)::NUMERIC / NULLIF(score_data.total, 0) * 100));

  SELECT COUNT(*) INTO score_data.inc_count
  FROM public.incidents
  WHERE route_id = p_route_id;

  inc_score := GREATEST(0, 100 - (score_data.inc_count::NUMERIC / NULLIF(score_data.total, 0) * 40));
  comp_score := COALESCE(score_data.delivered::NUMERIC / NULLIF(score_data.total, 0) * 100, 100);
  overall := (punct_score * 0.4) + (inc_score * 0.35) + (comp_score * 0.25);

  INSERT INTO public.driver_scores
    (driver_id, route_id, date, punctuality_score, incident_score,
     avg_delivery_time_min, route_compliance_score, overall_score,
     deliveries_count, incidents_count, late_deliveries_count)
  VALUES
    (route_rec.driver_id, p_route_id, CURRENT_DATE,
     punct_score, inc_score, score_data.avg_minutes, comp_score, overall,
     score_data.total, score_data.inc_count, score_data.late);

  UPDATE public.drivers
  SET score = (
    SELECT AVG(overall_score) FROM public.driver_scores
    WHERE driver_id = route_rec.driver_id AND date >= CURRENT_DATE - 30
  )
  WHERE id = route_rec.driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-purge locations older than 30 days
CREATE OR REPLACE FUNCTION public.purge_old_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.locations
  WHERE recorded_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- pg_cron JOBS (ejecutar después de activar pg_cron extension)
-- ============================================================
-- SELECT cron.schedule('check-inactivity', '*/5 * * * *', 'SELECT public.check_driver_inactivity()');
-- SELECT cron.schedule('purge-locations', '0 3 * * *', 'SELECT public.purge_old_locations()');

-- ============================================================
-- REALTIME (habilitar en Supabase Dashboard > Realtime)
-- ============================================================
-- Habilitar para: locations, alerts, events, routes, deliveries

-- ============================================================
-- STORAGE (crear en Supabase Dashboard > Storage)
-- ============================================================
-- Bucket: "photos" — público para lectura, autenticado para escritura
-- Policy INSERT: authenticated users
-- Policy SELECT: public

```

### `supabase/seed.sql`

```sql
-- ============================================================
-- FleetTrack Honduras — Seed data (desarrollo)
-- ============================================================

-- Checklist template predeterminado
INSERT INTO public.checklist_templates (id, name, items) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Checklist Pre-Salida Estándar',
  '[
    {"id": "carga_completa", "label": "Carga completa y asegurada", "required": true},
    {"id": "documentos", "label": "Documentos de entrega listos (facturas, guías)", "required": true},
    {"id": "combustible", "label": "Nivel de combustible suficiente para la ruta", "required": true},
    {"id": "llanta_repuesto", "label": "Llanta de repuesto revisada", "required": true},
    {"id": "luces", "label": "Luces frontales y traseras funcionando", "required": true},
    {"id": "frenos", "label": "Frenos revisados", "required": true},
    {"id": "agua_aceite", "label": "Nivel de agua y aceite OK", "required": false},
    {"id": "celular_cargado", "label": "Celular cargado (mínimo 50%)", "required": true}
  ]'::jsonb
);

-- Bodega principal (geocerca)
INSERT INTO public.geofences (name, type, lat, lng, radius_m) VALUES
  ('Bodega Principal Tegucigalpa', 'warehouse', 14.0650, -87.1925, 300);

-- Camiones de ejemplo
INSERT INTO public.trucks (id, plate, brand, model, year, capacity_lbs) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'HND-001', 'Isuzu', 'NQR', 2022, 12000),
  ('b1000000-0000-0000-0000-000000000002', 'HND-002', 'Isuzu', 'NQR', 2021, 12000),
  ('b1000000-0000-0000-0000-000000000003', 'HND-003', 'Hino', '300', 2023, 8000);

```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "clean": {
      "cache": false
    }
  }
}

```

