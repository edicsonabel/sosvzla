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
    'page_view',          -- se cargó una página (path no sensible) — pageviews
    'session_start',      -- 1 por pestaña (sessionStorage) — visitantes únicos
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

-- ------------------------------------------------------------
-- RPC pública: analytics_summary()
--   Devuelve SOLO agregados (totales y series), nunca filas crudas ni
--   timestamps individuales. Pensada para el panel público /estadisticas
--   y el resumen de la home. Ejecutable por anon (security definer).
--
--   Forma del JSON devuelto:
--   {
--     "totals":   { "<event>": <int>, ... },          -- todo el tiempo
--     "last7d":   { "<event>": <int>, ... },
--     "last30d":  { "<event>": <int>, ... },
--     "daily":    [ { "day": "YYYY-MM-DD",
--                     "<event>": <int>, ... }, ... ],  -- últimos 30 días
--     "by_type":     { "<report type>": <int>, ... },  -- report_created.props.type
--     "by_channel":  { "<share channel>": <int>, ... },-- report_shared.props.channel
--     "generated_at": "<timestamptz>"
--   }
-- ------------------------------------------------------------
create or replace function public.analytics_summary()
returns jsonb
language sql stable security definer set search_path = public as $$
  with totals as (
    select name, count(*)::int as total
    from analytics_events
    group by name
  ),
  last7 as (
    select name, count(*)::int as total
    from analytics_events
    where created_at >= now() - interval '7 days'
    group by name
  ),
  last30 as (
    select name, count(*)::int as total
    from analytics_events
    where created_at >= now() - interval '30 days'
    group by name
  ),
  -- Serie diaria de los últimos 30 días: una fila por día con el conteo de
  -- cada evento como par clave/valor. Rellena días sin eventos en 0.
  days as (
    select generate_series(
      date_trunc('day', now()) - interval '29 days',
      date_trunc('day', now()),
      interval '1 day'
    )::date as day
  ),
  daily_counts as (
    select date_trunc('day', created_at)::date as day, name, count(*)::int as total
    from analytics_events
    where created_at >= now() - interval '30 days'
    group by 1, 2
  ),
  daily as (
    select d.day,
           coalesce(jsonb_object_agg(dc.name, dc.total) filter (where dc.name is not null), '{}'::jsonb) as counts
    from days d
    left join daily_counts dc on dc.day = d.day
    group by d.day
    order by d.day
  ),
  by_type as (
    select coalesce(props->>'type', 'other') as k, count(*)::int as total
    from analytics_events
    where name = 'report_created'
    group by 1
  ),
  by_channel as (
    select coalesce(props->>'channel', 'other') as k, count(*)::int as total
    from analytics_events
    where name = 'report_shared'
    group by 1
  )
  select jsonb_build_object(
    'totals',       coalesce((select jsonb_object_agg(name, total) from totals), '{}'::jsonb),
    'last7d',       coalesce((select jsonb_object_agg(name, total) from last7), '{}'::jsonb),
    'last30d',      coalesce((select jsonb_object_agg(name, total) from last30), '{}'::jsonb),
    'daily',        coalesce((select jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD')) || counts) from daily), '[]'::jsonb),
    'by_type',      coalesce((select jsonb_object_agg(k, total) from by_type), '{}'::jsonb),
    'by_channel',   coalesce((select jsonb_object_agg(k, total) from by_channel), '{}'::jsonb),
    'generated_at', now()
  );
$$;

grant execute on function public.analytics_summary to anon, authenticated;

-- ------------------------------------------------------------
-- RPC pública: persons_stats()
--   Conteo agregado del estado de las personas reportadas. A diferencia de
--   analytics_summary (eventos de uso), esto refleja la tabla persons real.
--   Solo totales por estado, nunca filas ni datos personales.
--
--   { "total": <int>,            -- todas las personas reportadas
--     "missing": <int>,          -- aún sin contacto
--     "safe": <int>,             -- localizadas a salvo (safe + found)
--     "found_pending": <int> }   -- "lo encontré" por confirmar
-- ------------------------------------------------------------
create or replace function public.persons_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total',         count(*)::int,
    'missing',       count(*) filter (where status = 'missing')::int,
    'safe',          count(*) filter (where status in ('safe', 'found'))::int,
    'found_pending', count(*) filter (where status = 'found_pending')::int
  )
  from public.persons;
$$;

grant execute on function public.persons_stats to anon, authenticated;
