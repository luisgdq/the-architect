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
