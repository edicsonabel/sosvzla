-- ============================================================
-- SOS Venezuela — Endurecimiento de seguridad
-- Identificadores en inglés; comentarios en español.
-- Ejecutar DESPUÉS de schema.sql en: Supabase SQL Editor
--
-- Estrategia:
--  - Público anónimo: puede INSERTAR (emergencia) y LEER solo vistas
--    seguras SIN datos de contacto y SIN reportes marcados 'false_report'.
--  - Voluntarios (en tabla volunteers): leen tablas completas (con
--    contacto), cambian estado, marcan 'false_report'.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ROL DE VOLUNTARIO (tabla de perfiles ligada a auth.users)
-- ------------------------------------------------------------
create table if not exists public.volunteers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

-- helper: el usuario actual es voluntario?
create or replace function public.is_volunteer()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.volunteers v where v.user_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- 2. RECONSTRUIR POLÍTICAS RLS (reemplazan las del MVP)
-- ------------------------------------------------------------

-- ---- reports ----
-- Idempotente: borramos tanto las del MVP como las que crea este archivo,
-- para poder re-ejecutar security.sql sin errores.
drop policy if exists "reports_select_public"    on public.reports;
drop policy if exists "reports_insert_public"    on public.reports;
drop policy if exists "reports_update_auth"      on public.reports;
drop policy if exists "reports_delete_auth"      on public.reports;
drop policy if exists "reports_select_volunteer" on public.reports;
drop policy if exists "reports_update_volunteer" on public.reports;
drop policy if exists "reports_delete_volunteer" on public.reports;

-- El público ya NO lee la tabla cruda (usa la vista de abajo).
-- Solo voluntarios leen la tabla completa.
create policy "reports_select_volunteer" on public.reports
  for select using (public.is_volunteer());

-- Insertar ya NO es directo del público: pasa por /api/submit (captcha +
-- rate-limit por IP) que inserta con la secret key (salta RLS). Por eso
-- NO creamos política de insert anónima: cerramos la puerta directa.
-- (Si en algún momento se quiere permitir insert directo, reañadir aquí.)

-- Solo voluntarios cambian estado / borran.
create policy "reports_update_volunteer" on public.reports
  for update using (public.is_volunteer());
create policy "reports_delete_volunteer" on public.reports
  for delete using (public.is_volunteer());

-- ---- persons ----
drop policy if exists "persons_select_public"    on public.persons;
drop policy if exists "persons_insert_public"    on public.persons;
drop policy if exists "persons_update_auth"      on public.persons;
drop policy if exists "persons_delete_auth"      on public.persons;
drop policy if exists "persons_select_volunteer" on public.persons;
drop policy if exists "persons_update_volunteer" on public.persons;
drop policy if exists "persons_delete_volunteer" on public.persons;

create policy "persons_select_volunteer" on public.persons
  for select using (public.is_volunteer());
-- Insert vía /api/submit (secret key), no directo. Sin política anónima.
create policy "persons_update_volunteer" on public.persons
  for update using (public.is_volunteer());
create policy "persons_delete_volunteer" on public.persons
  for delete using (public.is_volunteer());

-- ------------------------------------------------------------
-- 3. VISTAS PÚBLICAS SEGURAS (sin contacto, sin 'false_report')
--    El frontend anónimo lee de estas vistas.
-- ------------------------------------------------------------
create or replace view public.reports_public
with (security_invoker = false) as
  select id, type, description, lat, lng, photo_url, status, created_at
  from public.reports
  where status <> 'false_report';

create or replace view public.persons_public
with (security_invoker = false) as
  select id, name, document_id, status, last_seen, description, photo_url, created_at
  from public.persons;

-- Conceder lectura de las vistas a los roles anónimo y autenticado.
grant select on public.reports_public to anon, authenticated;
grant select on public.persons_public to anon, authenticated;

-- RPC de cercanos: versión pública sin contacto.
create or replace function public.nearby_reports_public(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 5000
)
returns table (
  id uuid, type text, description text,
  lat double precision, lng double precision,
  status text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.type, r.description, r.lat, r.lng, r.status, r.created_at
  from public.reports r
  where r.status <> 'false_report'
    and ST_DWithin(
      r.geo,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by r.geo <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
$$;
grant execute on function public.nearby_reports_public to anon, authenticated;

-- ------------------------------------------------------------
-- 3.b EDICIÓN PROPIA por el reportante (sin login)
--    El reportante guardó el hash de su cédula al crear. Para editar,
--    reenvía su cédula; el server la hashea y compara. Solo edita campos
--    visibles; no permite cambiar status a 'found' ni tocar el hash.
--    NOTA: el hash se calcula sha256 en cliente y servidor por igual.
-- ------------------------------------------------------------
create or replace function public.update_person_self(
  p_id          uuid,
  p_editor_doc  text,           -- cédula del reportante en claro
  p_name        text,
  p_document_id text,
  p_last_seen   text,
  p_description text,
  p_contact     text,
  p_photo_url   text
)
returns public.persons_public
language plpgsql security definer set search_path = public as $$
declare
  v_hash text := encode(digest(coalesce(p_editor_doc, ''), 'sha256'), 'hex');
  v_row  public.persons;
  v_out  public.persons_public;
begin
  if coalesce(p_editor_doc, '') = '' then
    raise exception 'Cédula requerida para editar.' using errcode = 'check_violation';
  end if;

  update public.persons p
     set name        = coalesce(nullif(p_name, ''), p.name),
         document_id = nullif(p_document_id, ''),
         last_seen   = nullif(p_last_seen, ''),
         description = nullif(p_description, ''),
         contact     = nullif(p_contact, ''),
         photo_url   = nullif(p_photo_url, ''),
         updated_at  = now()
   where p.id = p_id
     and p.editor_doc_hash is not null
     and p.editor_doc_hash = v_hash
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Cédula no coincide o el reporte no permite edición.'
      using errcode = 'check_violation';
  end if;

  select id, name, document_id, status, last_seen, description, photo_url, created_at
    into v_out
    from public.persons where id = v_row.id;
  return v_out;
end $$;
grant execute on function public.update_person_self to anon, authenticated;

-- ------------------------------------------------------------
-- 3.c "CREO QUE LO ENCONTRÉ" por el reportante (sin login)
--    El reportante reenvía su cédula y solo puede dejar el estado en
--    'found_pending' (sugerencia). NO puede poner 'found' directo: eso lo
--    confirma un voluntario. Solo aplica si la persona está 'missing'.
-- ------------------------------------------------------------
create or replace function public.claim_person_found(
  p_id         uuid,
  p_editor_doc text
)
returns public.persons_public
language plpgsql security definer set search_path = public as $$
declare
  v_hash text := encode(digest(coalesce(p_editor_doc, ''), 'sha256'), 'hex');
  v_row  public.persons;
  v_out  public.persons_public;
begin
  if coalesce(p_editor_doc, '') = '' then
    raise exception 'Cédula requerida.' using errcode = 'check_violation';
  end if;

  update public.persons p
     set status     = 'found_pending',
         updated_at = now()
   where p.id = p_id
     and p.editor_doc_hash is not null
     and p.editor_doc_hash = v_hash
     and p.status = 'missing'   -- solo desde 'desaparecido'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Cédula no coincide o la persona ya no está marcada como desaparecida.'
      using errcode = 'check_violation';
  end if;

  select id, name, document_id, status, last_seen, description, photo_url, created_at
    into v_out
    from public.persons where id = v_row.id;
  return v_out;
end $$;
grant execute on function public.claim_person_found to anon, authenticated;

-- ------------------------------------------------------------
-- 4. RATE LIMITING POR IP (anti-spam)
--    El insert anónimo ya NO va directo del navegador: pasa por el route
--    handler /api/submit (Vercel), que verifica captcha Turnstile y llama a
--    bump_ip_rate con la IP del cliente. Limita por IP, no global, para que
--    un solo abusador no bloquee a todos.
--
--    Migración: si existían los triggers/tabla globales del MVP, se eliminan.
-- ------------------------------------------------------------
drop trigger if exists trg_reports_rate on public.reports;
drop trigger if exists trg_persons_rate on public.persons;
drop function if exists public.check_rate_limit();
drop table if exists public.rate_buckets;

-- Bucket por (ventana de minuto, IP).
create table if not exists public.rate_buckets (
  window_start timestamptz not null,
  ip           text not null,
  count        int not null default 0,
  primary key (window_start, ip)
);
-- El público NO accede a esta tabla (solo el server con secret key / RPC).
revoke all on public.rate_buckets from anon, authenticated;

-- Incrementa el contador de la IP en el minuto actual y devuelve true si
-- sigue dentro del límite. SECURITY DEFINER: la llama el server.
create or replace function public.bump_ip_rate(p_ip text, p_max int default 12)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_current int;
begin
  insert into public.rate_buckets (window_start, ip, count)
    values (v_window, coalesce(nullif(p_ip, ''), 'unknown'), 1)
    on conflict (window_start, ip)
    do update set count = public.rate_buckets.count + 1
    returning count into v_current;

  -- Limpieza oportunista de ventanas viejas (más de 10 min).
  delete from public.rate_buckets where window_start < now() - interval '10 minutes';

  return v_current <= p_max;
end $$;

-- Solo el rol de servicio (secret key) ejecuta esto; revocamos al público.
revoke all on function public.bump_ip_rate(text, int) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Para dar de alta un voluntario (tras crear su cuenta en Auth):
--   insert into public.volunteers (user_id, name)
--   values ('<uuid-del-usuario>', 'Nombre');
-- ------------------------------------------------------------
