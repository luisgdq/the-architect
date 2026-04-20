-- ============================================================
-- FleetTrack Honduras — Seed data (desarrollo)
-- ============================================================

-- Checklist template predeterminado
INSERT INTO public.checklist_templates (id, name, items) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Checklist Pre-Salida Estándar',
  '[
    {"id": "carga_completa", "label": "Carga completa y asegurada", "required": true},
    {"id": "documentos", "label": "Documentos de entrega listos (facturas, guías)", "required": true},
    {"id": "combustible", "label": "Nivel de combustible suficiente para la ruta", "required": true},
    {"id": "llanta_repuesto", "label": "Llanta de repuesto revisada", "required": true},
    {"id": "luces", "label": "Luces frontales y traseras funcionando", "required": true},
    {"id": "frenos", "label": "Frenos revisados", "required": true},
    {"id": "agua_aceite", "label": "Nivel de agua y aceite OK", "required": false},
    {"id": "celular_cargado", "label": "Celular cargado (mínimo 50%)", "required": true}
  ]'::jsonb
);

-- Bodega principal (geocerca)
INSERT INTO public.geofences (name, type, lat, lng, radius_m) VALUES
  ('Bodega Principal Tegucigalpa', 'warehouse', 14.0650, -87.1925, 300);

-- Camiones de ejemplo
INSERT INTO public.trucks (id, plate, brand, model, year, capacity_lbs) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'HND-001', 'Isuzu', 'NQR', 2022, 12000),
  ('b1000000-0000-0000-0000-000000000002', 'HND-002', 'Isuzu', 'NQR', 2021, 12000),
  ('b1000000-0000-0000-0000-000000000003', 'HND-003', 'Hino', '300', 2023, 8000);
