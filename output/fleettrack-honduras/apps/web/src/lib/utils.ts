import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TruckStatus, AlertSeverity, DeliveryStatus } from '@fleettrack/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy HH:mm') {
  return format(new Date(date), pattern, { locale: es })
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatWeight(lbs: number) {
  return `${lbs.toLocaleString('es-HN')} lbs`
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

export const STATUS_COLORS: Record<TruckStatus, string> = {
  moving: '#30D158',
  stopped: '#FF9F0A',
  delivering: '#0071E3',
  off_route: '#BF5AF2',
  offline: '#8E8E93',
}

export const STATUS_LABELS: Record<TruckStatus, string> = {
  moving: 'En movimiento',
  stopped: 'Detenido',
  delivering: 'En entrega',
  off_route: 'Fuera de ruta',
  offline: 'Sin señal',
}

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  low: '#30D158',
  medium: '#FF9F0A',
  high: '#FF375F',
  critical: '#FF375F',
}

export const SEVERITY_BG: Record<AlertSeverity, string> = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-100 text-red-800 border-red-300',
}

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: '#6E6E73',
  in_route: '#0071E3',
  arrived: '#FF9F0A',
  in_progress: '#FF9F0A',
  delivered: '#30D158',
  incident: '#FF375F',
  returned: '#BF5AF2',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendiente',
  in_route: 'En ruta',
  arrived: 'Llegó',
  in_progress: 'En descarga',
  delivered: 'Entregado',
  incident: 'Incidencia',
  returned: 'Devuelto',
}
