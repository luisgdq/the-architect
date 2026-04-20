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
