-- ============================================================
-- SOS Venezuela — Analítica de eventos (privacy-first)
-- Identificadores en inglés; comentarios en español.
-- Ejecutar DESPUÉS de schema.sql y security.sql en: Supabase SQL Editor
--
-- Por qué propia y no GA4: app de emergencia con usuarios vulnerables.
-- NO guardamos PII, NI IP, NI user-agent, NI identificador de usuario.
-- Solo: nombre de evento (whitelist) + props no sensibles + timestamp.
-- Suficiente para contar uso (reportes creados, búsquedas, etc.) y armar
-- embudos básicos, sin cookies ni banner de consentimiento.
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: analytics_events
-- ------------------------------------------------------------
create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  name        text not null,
  -- props: SOLO datos no sensibles (ej. {"type":"medical"}). El RPC valida
  -- la whitelist de nombres; el cliente jamás manda PII aquí.
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Índices para agregaciones por nombre y por día.
create index if not exists idx_analytics_name on public.analytics_events (name);
create index if not exists idx_analytics_created on public.analytics_events (created_at);

-- ------------------------------------------------------------
-- RLS: nadie toca la tabla cruda. El público SOLO inserta vía RPC
-- (security definer). Los voluntarios leen agregados vía vista.
-- ------------------------------------------------------------
alter table public.analytics_events enable row level security;

-- Idempotente: re-ejecutable sin error.
drop policy if exists "analytics_select_volunteer" on public.analytics_events;

-- Solo voluntarios leen la tabla cruda (por si hace falta depurar).
create policy "analytics_select_volunteer" on public.analytics_events
  for select using (public.is_volunteer());

-- Sin política de insert anónima: la puerta directa queda cerrada.
-- Se inserta únicamente por track_event (definer, salta RLS).

-- ------------------------------------------------------------
-- RPC: track_event(name, props)
--   - Valida el nombre contra una whitelist (evita basura/abuso).
--   - Limita el tamaño de props (anti-spam de payload).
--   - No persiste IP/UA/usuario.
-- ------------------------------------------------------------
create or replace function public.track_event(
  p_name  text,
  p_props jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  -- Whitelist de eventos conocidos. Añadir aquí al crear nuevos flujos.
  v_allowed constant text[] := array[
    'report_created',     -- se creó un reporte de emergencia
    'person_reported',    -- se reportó una persona desaparecida
    'search_performed',   -- el usuario buscó en /buscar
    'map_viewed',         -- se abrió el mapa en vivo
    'report_shared',      -- se compartió un reporte
    'person_found_claim'  -- el reportante sugirió "lo encontré"
  ];
  v_props jsonb := coalesce(p_props, '{}'::jsonb);
begin
  if not (p_name = any(v_allowed)) then
    -- Nombre desconocido: lo ignoramos en silencio (no rompemos el flujo
    -- del usuario por un evento mal escrito).
    return;
  end if;

  -- Cota dura al tamaño de props para que nadie use esto como vertedero.
  if length(v_props::text) > 1024 then
    v_props := '{}'::jsonb;
  end if;

  insert into public.analytics_events (name, props)
  values (p_name, v_props);
end $$;

grant execute on function public.track_event to anon, authenticated;

-- ------------------------------------------------------------
-- Vista agregada para voluntarios: conteo por evento y por día.
-- (No expone filas crudas; solo totales.)
-- ------------------------------------------------------------
create or replace view public.analytics_daily
with (security_invoker = true) as
  select
    name,
    date_trunc('day', created_at) as day,
    count(*) as total
  from public.analytics_events
  group by name, date_trunc('day', created_at)
  order by day desc, name;

grant select on public.analytics_daily to authenticated;
