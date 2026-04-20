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
