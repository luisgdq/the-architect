export type UserRole = 'admin' | 'driver'
export type DriverStatus = 'off_duty' | 'on_route' | 'delivering' | 'stopped' | 'emergency'
export type TruckStatus = 'moving' | 'stopped' | 'delivering' | 'off_route' | 'offline'
export type DeliveryStatus = 'pending' | 'in_route' | 'arrived' | 'in_progress' | 'delivered' | 'incident' | 'returned'
export type RouteStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertType = 'inactivity' | 'delay' | 'geofence_entry' | 'geofence_exit' | 'signal_loss' | 'emergency' | 'overload' | 'delivery_late'
export type IncidentType = 'traffic' | 'accident' | 'vehicle_issue' | 'customer_absent' | 'wrong_address' | 'product_damage' | 'inactivity' | 'emergency' | 'other'
export type IncidentStatus = 'open' | 'reviewing' | 'resolved' | 'escalated'
export type PhotoType = 'delivery' | 'incident' | 'checklist' | 'damage'
export type GeofenceType = 'warehouse' | 'customer' | 'zone'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Truck {
  id: string
  plate: string
  brand: string
  model: string
  year?: number
  capacity_lbs: number
  fuel_type: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  profile_id: string
  license_number: string
  license_expires_at: string
  assigned_truck_id?: string
  current_status: DriverStatus
  score: number
  created_at: string
  updated_at: string
  profile?: Profile
  truck?: Truck
}

export interface Customer {
  id: string
  name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  lat?: number
  lng?: number
  notes?: string
  incident_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Geofence {
  id: string
  name: string
  type: GeofenceType
  lat: number
  lng: number
  radius_m: number
  customer_id?: string
  is_active: boolean
  created_at: string
}

export interface Route {
  id: string
  name?: string
  driver_id?: string
  truck_id?: string
  scheduled_date: string
  status: RouteStatus
  total_weight_lbs: number
  occupancy_pct: number
  started_at?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
  driver?: Driver
  truck?: Truck
  deliveries?: Delivery[]
}

export interface Delivery {
  id: string
  route_id?: string
  customer_id: string
  invoice_number?: string
  weight_lbs: number
  status: DeliveryStatus
  sequence_order: number
  arrived_at?: string
  delivery_started_at?: string
  delivered_at?: string
  time_limit_minutes: number
  requires_auth: boolean
  authorized_by?: string
  authorized_at?: string
  notes?: string
  customer_signature_url?: string
  created_at: string
  updated_at: string
  customer?: Customer
  photos?: DeliveryPhoto[]
}

export interface Location {
  id: string
  driver_id: string
  truck_id?: string
  route_id?: string
  lat: number
  lng: number
  speed_kmh: number
  heading?: number
  accuracy_m?: number
  battery_pct?: number
  is_online: boolean
  recorded_at: string
}

export interface Incident {
  id: string
  delivery_id?: string
  driver_id: string
  route_id?: string
  type: IncidentType
  description?: string
  photo_url?: string
  lat?: number
  lng?: number
  status: IncidentStatus
  resolved_by?: string
  resolved_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  driver?: Driver
  delivery?: Delivery
}

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  driver_id?: string
  route_id?: string
  delivery_id?: string
  title: string
  message?: string
  is_read: boolean
  is_resolved: boolean
  resolved_by?: string
  resolved_at?: string
  metadata: Record<string, unknown>
  created_at: string
  driver?: Driver
}

export interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

export interface ChecklistTemplate {
  id: string
  name: string
  items: ChecklistItem[]
  is_active: boolean
  created_at: string
}

export interface ChecklistResponse {
  id: string
  template_id?: string
  route_id: string
  driver_id: string
  responses: Record<string, boolean>
  is_complete: boolean
  completed_at?: string
  created_at: string
}

export interface DeliveryPhoto {
  id: string
  delivery_id: string
  driver_id: string
  photo_url: string
  photo_type: PhotoType
  lat?: number
  lng?: number
  taken_at: string
}

export interface DriverScore {
  id: string
  driver_id: string
  route_id?: string
  date: string
  punctuality_score: number
  incident_score: number
  avg_delivery_time_min?: number
  route_compliance_score: number
  overall_score: number
  deliveries_count: number
  incidents_count: number
  late_deliveries_count: number
  created_at: string
  driver?: Driver
}

// Client-side real-time state
export interface TruckRealtime {
  driver_id: string
  truck_id?: string
  driver_name: string
  truck_plate?: string
  lat: number
  lng: number
  speed_kmh: number
  heading?: number
  battery_pct?: number
  is_online: boolean
  last_seen: string
  status: TruckStatus
  current_delivery?: {
    id: string
    customer_name: string
    status: DeliveryStatus
  }
}

export interface KPIData {
  total_deliveries: number
  completed_deliveries: number
  pending_deliveries: number
  active_routes: number
  active_drivers: number
  total_incidents: number
  avg_delivery_time_min: number
  completion_rate: number
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  traffic: 'Tráfico',
  accident: 'Accidente',
  vehicle_issue: 'Problema de vehículo',
  customer_absent: 'Cliente ausente',
  wrong_address: 'Dirección incorrecta',
  product_damage: 'Daño en producto',
  inactivity: 'Inactividad',
  emergency: 'Emergencia',
  other: 'Otro',
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

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}
