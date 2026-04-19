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
