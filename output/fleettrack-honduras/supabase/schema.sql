-- ============================================================
-- FleetTrack Honduras — Schema completo
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ── PROFILES (extiende auth.users) ──────────────────────────
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── TRUCKS ──────────────────────────────────────────────────
CREATE TABLE public.trucks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate         TEXT NOT NULL UNIQUE,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          INTEGER,
  capacity_lbs  NUMERIC(10,2) NOT NULL,
  fuel_type     TEXT DEFAULT 'diesel',
  is_active     BOOLEAN DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── DRIVERS ─────────────────────────────────────────────────
CREATE TABLE public.drivers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  license_number     TEXT NOT NULL UNIQUE,
  license_expires_at DATE NOT NULL,
  assigned_truck_id  UUID REFERENCES public.trucks(id),
  current_status     TEXT DEFAULT 'off_duty'
                     CHECK (current_status IN ('off_duty','on_route','delivering','stopped','emergency')),
  score              NUMERIC(5,2) DEFAULT 100.00,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE public.customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  contact_name   TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  lat            NUMERIC(10,8),
  lng            NUMERIC(11,8),
  notes          TEXT,
  incident_count INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── GEOFENCES ───────────────────────────────────────────────
CREATE TABLE public.geofences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('warehouse','customer','zone')),
  lat         NUMERIC(10,8) NOT NULL,
  lng         NUMERIC(11,8) NOT NULL,
  radius_m    INTEGER NOT NULL DEFAULT 200,
  customer_id UUID REFERENCES public.customers(id),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ROUTES ──────────────────────────────────────────────────
CREATE TABLE public.routes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT,
  driver_id        UUID REFERENCES public.drivers(id),
  truck_id         UUID REFERENCES public.trucks(id),
  scheduled_date   DATE NOT NULL,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed','cancelled')),
  total_weight_lbs NUMERIC(10,2) DEFAULT 0,
  occupancy_pct    NUMERIC(5,2) DEFAULT 0,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── DELIVERIES ──────────────────────────────────────────────
CREATE TABLE public.deliveries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id             UUID REFERENCES public.routes(id),
  customer_id          UUID REFERENCES public.customers(id) NOT NULL,
  invoice_number       TEXT,
  weight_lbs           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status               TEXT DEFAULT 'pending'
                       CHECK (status IN ('pending','in_route','arrived','in_progress','delivered','incident','returned')),
  sequence_order       INTEGER DEFAULT 0,
  arrived_at           TIMESTAMPTZ,
  delivery_started_at  TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  time_limit_minutes   INTEGER DEFAULT 120,
  requires_auth        BOOLEAN DEFAULT false,
  authorized_by        UUID REFERENCES public.profiles(id),
  authorized_at        TIMESTAMPTZ,
  notes                TEXT,
  customer_signature_url TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ── LOCATIONS (GPS trail) ────────────────────────────────────
CREATE TABLE public.locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID REFERENCES public.drivers(id) NOT NULL,
  truck_id    UUID REFERENCES public.trucks(id),
  route_id    UUID REFERENCES public.routes(id),
  lat         NUMERIC(10,8) NOT NULL,
  lng         NUMERIC(11,8) NOT NULL,
  speed_kmh   NUMERIC(6,2) DEFAULT 0,
  heading     NUMERIC(5,2),
  accuracy_m  NUMERIC(8,2),
  battery_pct INTEGER,
  is_online   BOOLEAN DEFAULT true,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- ── EVENTS ──────────────────────────────────────────────────
CREATE TABLE public.events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  driver_id   UUID REFERENCES public.drivers(id),
  truck_id    UUID REFERENCES public.trucks(id),
  route_id    UUID REFERENCES public.routes(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  lat         NUMERIC(10,8),
  lng         NUMERIC(11,8),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── INCIDENTS ───────────────────────────────────────────────
CREATE TABLE public.incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id),
  driver_id   UUID REFERENCES public.drivers(id) NOT NULL,
  route_id    UUID REFERENCES public.routes(id),
  type        TEXT NOT NULL
              CHECK (type IN ('traffic','accident','vehicle_issue','customer_absent',
                              'wrong_address','product_damage','inactivity','emergency','other')),
  description TEXT,
  photo_url   TEXT,
  lat         NUMERIC(10,8),
  lng         NUMERIC(11,8),
  status      TEXT DEFAULT 'open'
              CHECK (status IN ('open','reviewing','resolved','escalated')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ALERTS ──────────────────────────────────────────────────
CREATE TABLE public.alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  severity    TEXT DEFAULT 'medium'
              CHECK (severity IN ('low','medium','high','critical')),
  driver_id   UUID REFERENCES public.drivers(id),
  route_id    UUID REFERENCES public.routes(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  title       TEXT NOT NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── CHECKLIST TEMPLATES ─────────────────────────────────────
CREATE TABLE public.checklist_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  items      JSONB NOT NULL DEFAULT '[]',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── CHECKLIST RESPONSES ─────────────────────────────────────
CREATE TABLE public.checklist_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID REFERENCES public.checklist_templates(id),
  route_id     UUID REFERENCES public.routes(id) NOT NULL,
  driver_id    UUID REFERENCES public.drivers(id) NOT NULL,
  responses    JSONB NOT NULL DEFAULT '{}',
  is_complete  BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── DELIVERY PHOTOS ─────────────────────────────────────────
CREATE TABLE public.delivery_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) NOT NULL,
  driver_id   UUID REFERENCES public.drivers(id) NOT NULL,
  photo_url   TEXT NOT NULL,
  photo_type  TEXT DEFAULT 'delivery'
              CHECK (photo_type IN ('delivery','incident','checklist','damage')),
  lat         NUMERIC(10,8),
  lng         NUMERIC(11,8),
  taken_at    TIMESTAMPTZ DEFAULT now()
);

-- ── DRIVER SCORES ───────────────────────────────────────────
CREATE TABLE public.driver_scores (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id                UUID REFERENCES public.drivers(id) NOT NULL,
  route_id                 UUID REFERENCES public.routes(id),
  date                     DATE NOT NULL,
  punctuality_score        NUMERIC(5,2) DEFAULT 100,
  incident_score           NUMERIC(5,2) DEFAULT 100,
  avg_delivery_time_min    NUMERIC(8,2),
  route_compliance_score   NUMERIC(5,2) DEFAULT 100,
  overall_score            NUMERIC(5,2) DEFAULT 100,
  deliveries_count         INTEGER DEFAULT 0,
  incidents_count          INTEGER DEFAULT 0,
  late_deliveries_count    INTEGER DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_locations_driver_recorded ON public.locations(driver_id, recorded_at DESC);
CREATE INDEX idx_locations_recorded_at ON public.locations(recorded_at DESC);
CREATE INDEX idx_deliveries_route ON public.deliveries(route_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_customer ON public.deliveries(customer_id);
CREATE INDEX idx_events_driver ON public.events(driver_id, created_at DESC);
CREATE INDEX idx_events_route ON public.events(route_id);
CREATE INDEX idx_alerts_unread ON public.alerts(is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_alerts_driver ON public.alerts(driver_id);
CREATE INDEX idx_incidents_driver ON public.incidents(driver_id);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_routes_scheduled ON public.routes(scheduled_date);
CREATE INDEX idx_routes_status ON public.routes(status);
CREATE INDEX idx_driver_scores_driver ON public.driver_scores(driver_id, date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_scores ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get driver id for current user
CREATE OR REPLACE FUNCTION public.my_driver_id()
RETURNS UUID AS $$
  SELECT id FROM public.drivers WHERE profile_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "users_own_profile" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin_manage_profiles" ON public.profiles
  FOR ALL USING (public.is_admin());
CREATE POLICY "user_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- TRUCKS policies
CREATE POLICY "authenticated_read_trucks" ON public.trucks
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_trucks" ON public.trucks
  FOR ALL USING (public.is_admin());

-- DRIVERS policies
CREATE POLICY "admin_manage_drivers" ON public.drivers
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own" ON public.drivers
  FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "driver_update_own_status" ON public.drivers
  FOR UPDATE USING (profile_id = auth.uid());

-- CUSTOMERS policies
CREATE POLICY "authenticated_read_customers" ON public.customers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_customers" ON public.customers
  FOR ALL USING (public.is_admin());

-- GEOFENCES policies
CREATE POLICY "authenticated_read_geofences" ON public.geofences
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_geofences" ON public.geofences
  FOR ALL USING (public.is_admin());

-- ROUTES policies
CREATE POLICY "admin_manage_routes" ON public.routes
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_routes" ON public.routes
  FOR SELECT USING (driver_id = public.my_driver_id());
CREATE POLICY "driver_update_own_route" ON public.routes
  FOR UPDATE USING (driver_id = public.my_driver_id());

-- DELIVERIES policies
CREATE POLICY "admin_manage_deliveries" ON public.deliveries
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_deliveries" ON public.deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_id AND r.driver_id = public.my_driver_id()
    )
  );
CREATE POLICY "driver_update_own_deliveries" ON public.deliveries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_id AND r.driver_id = public.my_driver_id()
    )
  );

-- LOCATIONS policies
CREATE POLICY "admin_read_all_locations" ON public.locations
  FOR SELECT USING (public.is_admin());
CREATE POLICY "driver_insert_own_location" ON public.locations
  FOR INSERT WITH CHECK (driver_id = public.my_driver_id());
CREATE POLICY "driver_read_own_locations" ON public.locations
  FOR SELECT USING (driver_id = public.my_driver_id());

-- EVENTS policies
CREATE POLICY "admin_read_all_events" ON public.events
  FOR SELECT USING (public.is_admin());
CREATE POLICY "driver_insert_own_events" ON public.events
  FOR INSERT WITH CHECK (driver_id = public.my_driver_id());
CREATE POLICY "driver_read_own_events" ON public.events
  FOR SELECT USING (driver_id = public.my_driver_id());

-- INCIDENTS policies
CREATE POLICY "admin_manage_incidents" ON public.incidents
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_insert_own_incidents" ON public.incidents
  FOR INSERT WITH CHECK (driver_id = public.my_driver_id());
CREATE POLICY "driver_read_own_incidents" ON public.incidents
  FOR SELECT USING (driver_id = public.my_driver_id());

-- ALERTS policies
CREATE POLICY "admin_manage_alerts" ON public.alerts
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_alerts" ON public.alerts
  FOR SELECT USING (driver_id = public.my_driver_id());

-- CHECKLIST policies
CREATE POLICY "authenticated_read_templates" ON public.checklist_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_manage_templates" ON public.checklist_templates
  FOR ALL USING (public.is_admin());

CREATE POLICY "driver_manage_own_checklist" ON public.checklist_responses
  FOR ALL USING (driver_id = public.my_driver_id());
CREATE POLICY "admin_read_checklist_responses" ON public.checklist_responses
  FOR SELECT USING (public.is_admin());

-- DELIVERY PHOTOS policies
CREATE POLICY "admin_read_all_photos" ON public.delivery_photos
  FOR SELECT USING (public.is_admin());
CREATE POLICY "driver_manage_own_photos" ON public.delivery_photos
  FOR ALL USING (driver_id = public.my_driver_id());

-- DRIVER SCORES policies
CREATE POLICY "admin_manage_scores" ON public.driver_scores
  FOR ALL USING (public.is_admin());
CREATE POLICY "driver_read_own_scores" ON public.driver_scores
  FOR SELECT USING (driver_id = public.my_driver_id());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_trucks_updated_at BEFORE UPDATE ON public.trucks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Geofence check on new location insert
CREATE OR REPLACE FUNCTION public.check_geofence_on_location()
RETURNS TRIGGER AS $$
DECLARE
  geofence_rec RECORD;
  distance_m   FLOAT;
BEGIN
  FOR geofence_rec IN
    SELECT * FROM public.geofences WHERE is_active = true
  LOOP
    distance_m := 111320 * sqrt(
      power(NEW.lat - geofence_rec.lat, 2) +
      power((NEW.lng - geofence_rec.lng) * cos(radians(NEW.lat)), 2)
    );

    IF distance_m <= geofence_rec.radius_m THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.events
        WHERE driver_id = NEW.driver_id
          AND type = 'geofence_enter_' || geofence_rec.id::text
          AND created_at > now() - INTERVAL '10 minutes'
      ) THEN
        INSERT INTO public.events (type, driver_id, truck_id, route_id, lat, lng, metadata)
        VALUES (
          'geofence_enter',
          NEW.driver_id,
          NEW.truck_id,
          NEW.route_id,
          NEW.lat,
          NEW.lng,
          jsonb_build_object('geofence_id', geofence_rec.id, 'geofence_name', geofence_rec.name, 'geofence_type', geofence_rec.type)
        );

        INSERT INTO public.alerts (type, severity, driver_id, route_id, title, message)
        VALUES (
          'geofence_entry',
          'low',
          NEW.driver_id,
          NEW.route_id,
          'Entrada: ' || geofence_rec.name,
          'El motorista ingresó a ' || geofence_rec.name
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_geofence_after_location
  AFTER INSERT ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.check_geofence_on_location();

-- Inactivity detection (called by pg_cron every 5 minutes)
CREATE OR REPLACE FUNCTION public.check_driver_inactivity()
RETURNS void AS $$
DECLARE
  driver_rec RECORD;
BEGIN
  FOR driver_rec IN
    SELECT DISTINCT ON (d.id)
      d.id AS driver_id,
      r.id AS route_id,
      l.recorded_at AS last_seen
    FROM public.drivers d
    JOIN public.routes r ON r.driver_id = d.id AND r.status = 'in_progress'
    JOIN public.locations l ON l.driver_id = d.id
    WHERE d.current_status = 'on_route'
    ORDER BY d.id, l.recorded_at DESC
  LOOP
    IF driver_rec.last_seen < now() - INTERVAL '20 minutes' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE driver_id = driver_rec.driver_id
          AND type = 'inactivity'
          AND is_resolved = false
          AND created_at > now() - INTERVAL '30 minutes'
      ) THEN
        INSERT INTO public.alerts (type, severity, driver_id, route_id, title, message)
        VALUES (
          'inactivity',
          'high',
          driver_rec.driver_id,
          driver_rec.route_id,
          'Motorista detenido +20 minutos',
          'El motorista no ha enviado ubicación en más de 20 minutos'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate driver score after route completion
CREATE OR REPLACE FUNCTION public.calculate_route_score(p_route_id UUID)
RETURNS void AS $$
DECLARE
  route_rec    RECORD;
  score_data   RECORD;
  punct_score  NUMERIC;
  inc_score    NUMERIC;
  comp_score   NUMERIC;
  overall      NUMERIC;
BEGIN
  SELECT r.*, d.id AS driver_id
  INTO route_rec
  FROM public.routes r
  JOIN public.drivers d ON d.id = r.driver_id
  WHERE r.id = p_route_id;

  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
    COUNT(*) FILTER (WHERE delivered_at > arrived_at + (time_limit_minutes || ' minutes')::INTERVAL) AS late,
    AVG(EXTRACT(EPOCH FROM (delivered_at - arrived_at)) / 60) FILTER (WHERE status = 'delivered') AS avg_minutes
  INTO score_data
  FROM public.deliveries
  WHERE route_id = p_route_id;

  punct_score := GREATEST(0, 100 - (COALESCE(score_data.late, 0)::NUMERIC / NULLIF(score_data.total, 0) * 100));

  SELECT COUNT(*) INTO score_data.inc_count
  FROM public.incidents
  WHERE route_id = p_route_id;

  inc_score := GREATEST(0, 100 - (score_data.inc_count::NUMERIC / NULLIF(score_data.total, 0) * 40));
  comp_score := COALESCE(score_data.delivered::NUMERIC / NULLIF(score_data.total, 0) * 100, 100);
  overall := (punct_score * 0.4) + (inc_score * 0.35) + (comp_score * 0.25);

  INSERT INTO public.driver_scores
    (driver_id, route_id, date, punctuality_score, incident_score,
     avg_delivery_time_min, route_compliance_score, overall_score,
     deliveries_count, incidents_count, late_deliveries_count)
  VALUES
    (route_rec.driver_id, p_route_id, CURRENT_DATE,
     punct_score, inc_score, score_data.avg_minutes, comp_score, overall,
     score_data.total, score_data.inc_count, score_data.late);

  UPDATE public.drivers
  SET score = (
    SELECT AVG(overall_score) FROM public.driver_scores
    WHERE driver_id = route_rec.driver_id AND date >= CURRENT_DATE - 30
  )
  WHERE id = route_rec.driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-purge locations older than 30 days
CREATE OR REPLACE FUNCTION public.purge_old_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.locations
  WHERE recorded_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- pg_cron JOBS (ejecutar después de activar pg_cron extension)
-- ============================================================
-- SELECT cron.schedule('check-inactivity', '*/5 * * * *', 'SELECT public.check_driver_inactivity()');
-- SELECT cron.schedule('purge-locations', '0 3 * * *', 'SELECT public.purge_old_locations()');

-- ============================================================
-- REALTIME (habilitar en Supabase Dashboard > Realtime)
-- ============================================================
-- Habilitar para: locations, alerts, events, routes, deliveries

-- ============================================================
-- STORAGE (crear en Supabase Dashboard > Storage)
-- ============================================================
-- Bucket: "photos" — público para lectura, autenticado para escritura
-- Policy INSERT: authenticated users
-- Policy SELECT: public
