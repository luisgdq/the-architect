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
