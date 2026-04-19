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
