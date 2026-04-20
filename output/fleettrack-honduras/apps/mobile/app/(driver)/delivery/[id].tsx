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
