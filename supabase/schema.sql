-- ============================================================
-- SOS Venezuela — Esquema de base de datos (Supabase / Postgres)
-- Identificadores en inglés; comentarios en español.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Extensiones: geo + uuid + cripto (hash de cédula del reportante)
create extension if not exists postgis;
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tabla: reports  (reportes de emergencia geolocalizados)
-- ------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  type         text not null check (type in ('medical','rescue','trapped','water_food','other')),
  description  text,
  -- lat/lng OPCIONALES: en emergencia el GPS puede fallar o no haber permiso.
  -- Si faltan, el reportante deja una referencia escrita en 'description'.
  lat          double precision,
  lng          double precision,
  geo          geography(point, 4326),   -- generada desde lat/lng (si existen)
  photo_url    text,
  contact      text,                      -- teléfono / nombre opcional
  status       text not null default 'pending'
               check (status in ('pending','dispatched','resolved','false_report')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Migración idempotente para BD existentes: permitir lat/lng nulos.
alter table public.reports alter column lat drop not null;
alter table public.reports alter column lng drop not null;

-- Rellena geo automáticamente desde lat/lng (si ambos existen).
create or replace function public.set_report_geo()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geo := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  else
    new.geo := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_report_geo on public.reports;
create trigger trg_report_geo
  before insert or update on public.reports
  for each row execute function public.set_report_geo();

-- Índice geoespacial para "reportes cercanos"
create index if not exists idx_reports_geo on public.reports using gist (geo);
create index if not exists idx_reports_status on public.reports (status);

-- ------------------------------------------------------------
-- Tabla: persons  (buscar desaparecidos / "estoy bien")
-- ------------------------------------------------------------
create table if not exists public.persons (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  document_id     text,           -- cédula / DNI / pasaporte (texto libre)
  -- found_pending: el reportante "cree que apareció"; un voluntario confirma.
  status          text not null default 'missing'
                  check (status in ('missing','safe','found','found_pending')),
  last_seen       text,           -- última ubicación conocida (texto libre)
  description     text,           -- señas, ropa, edad, etc.
  photo_url       text,
  reported_by     text,           -- quién reporta
  contact         text,
  -- Hash (sha256) de la cédula del REPORTANTE. Sirve de "clave" para editar
  -- luego su propio reporte. Nunca se expone en la vista pública.
  editor_doc_hash text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Migración para BD existentes (idempotente):
alter table public.persons add column if not exists document_id text;
alter table public.persons add column if not exists editor_doc_hash text;
-- Ampliar el check de status para incluir 'found_pending' en BD existentes.
alter table public.persons drop constraint if exists persons_status_check;
alter table public.persons add constraint persons_status_check
  check (status in ('missing','safe','found','found_pending'));

create index if not exists idx_persons_name on public.persons using gin (to_tsvector('spanish', name));
create index if not exists idx_persons_status on public.persons (status);
create index if not exists idx_persons_document on public.persons (document_id);

-- ------------------------------------------------------------
-- RPC: reportes dentro de un radio (metros) de un punto
-- ------------------------------------------------------------
create or replace function public.nearby_reports(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 5000
)
returns setof public.reports
language sql stable as $$
  select *
  from public.reports
  where status <> 'false_report'
    and ST_DWithin(
      geo,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by geo <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
$$;

-- ============================================================
-- SEGURIDAD (Row Level Security)
-- ============================================================
-- Estrategia MVP: cualquiera puede CREAR un reporte o reportar persona
-- (emergencia, sin login). LECTURA pública. Cambiar estado/borrar solo
-- con rol autenticado (voluntarios). El endurecimiento real (vistas sin
-- contacto, rol volunteer, rate limit) está en security.sql.
-- ============================================================

alter table public.reports enable row level security;
alter table public.persons enable row level security;

-- Idempotente: borramos antes de crear, para poder re-ejecutar schema.sql.
-- NOTA: security.sql REEMPLAZA estas políticas (cierra el insert anónimo y
-- usa vistas + rol volunteer). Estas son solo la base del MVP.
drop policy if exists "reports_select_public" on public.reports;
drop policy if exists "reports_insert_public" on public.reports;
drop policy if exists "reports_update_auth"  on public.reports;
drop policy if exists "reports_delete_auth"  on public.reports;
drop policy if exists "persons_select_public" on public.persons;
drop policy if exists "persons_insert_public" on public.persons;
drop policy if exists "persons_update_auth"  on public.persons;
drop policy if exists "persons_delete_auth"  on public.persons;

-- reports: lectura pública
create policy "reports_select_public" on public.reports
  for select using (true);

-- reports: insertar público (anon) — es una emergencia
create policy "reports_insert_public" on public.reports
  for insert with check (true);

-- reports: actualizar/borrar solo autenticados
create policy "reports_update_auth" on public.reports
  for update using (auth.role() = 'authenticated');
create policy "reports_delete_auth" on public.reports
  for delete using (auth.role() = 'authenticated');

-- persons: lectura pública, insertar público
create policy "persons_select_public" on public.persons
  for select using (true);
create policy "persons_insert_public" on public.persons
  for insert with check (true);
create policy "persons_update_auth" on public.persons
  for update using (auth.role() = 'authenticated');
create policy "persons_delete_auth" on public.persons
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- DATOS DEMO (borrar en producción)
-- ============================================================
insert into public.reports (type, description, lat, lng, contact) values
  ('trapped', 'Familia atrapada en edificio colapsado, 4 personas', 10.4806, -66.9036, 'Maria 0412-000'),
  ('medical', 'Persona herida necesita atención urgente', 10.5000, -66.9170, NULL),
  ('water_food','Refugio sin agua potable hace 2 días', 10.4900, -66.8800, NULL);

insert into public.persons (name, document_id, status, last_seen, description) values
  ('Jose Perez', 'V-12345678', 'missing', 'Cerca de Plaza Bolívar', 'Hombre 45 años, camisa azul'),
  ('Ana Gomez', 'V-23456789', 'safe', 'Refugio escuela municipal', 'Reportada a salvo por familiar');
