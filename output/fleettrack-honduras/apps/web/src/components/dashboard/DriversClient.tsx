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
