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
