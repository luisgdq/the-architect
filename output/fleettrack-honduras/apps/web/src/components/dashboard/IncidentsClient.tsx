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
