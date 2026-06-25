-- ============================================================
-- SOS Venezuela — Roles de admin + aprobación de voluntarios
-- Identificadores en inglés; comentarios en español.
-- Ejecutar DESPUÉS de schema.sql y security.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rol en volunteers: 'admin' o 'volunteer'
-- ------------------------------------------------------------
alter table public.volunteers
  add column if not exists role text not null default 'volunteer'
  check (role in ('admin', 'volunteer'));

-- helper: el usuario actual es admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.volunteers v
    where v.user_id = auth.uid() and v.role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 2. profiles: espejo de auth.users para que el admin pueda
--    ver quién se ha registrado (auth.users no es accesible
--    desde el cliente). Se llena por trigger al hacer signup.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

-- Llena profiles al crear un usuario en Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: copia los usuarios que ya existían antes del trigger
insert into public.profiles (id, email, full_name)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
from auth.users u
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. RLS de profiles: solo admin lee la lista completa;
--    cada quien puede leer su propia fila.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_admin_or_self" on public.profiles;
create policy "profiles_select_admin_or_self" on public.profiles
  for select using (public.is_admin() or id = auth.uid());

-- ------------------------------------------------------------
-- 4. RLS de volunteers (reemplaza políticas previas):
--    - cada quien lee su propia fila (para saber si es voluntario)
--    - admin lee todas
--    - solo admin inserta/actualiza/borra (aprobar, cambiar rol, quitar)
-- ------------------------------------------------------------
alter table public.volunteers enable row level security;

drop policy if exists "volunteers_select_self_or_admin" on public.volunteers;
create policy "volunteers_select_self_or_admin" on public.volunteers
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "volunteers_insert_admin" on public.volunteers;
create policy "volunteers_insert_admin" on public.volunteers
  for insert with check (public.is_admin());

drop policy if exists "volunteers_update_admin" on public.volunteers;
create policy "volunteers_update_admin" on public.volunteers
  for update using (public.is_admin());

drop policy if exists "volunteers_delete_admin" on public.volunteers;
create policy "volunteers_delete_admin" on public.volunteers
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 5. Vista: usuarios pendientes (registrados pero NO voluntarios).
--    Solo el admin la puede leer (filtra por is_admin en la función).
-- ------------------------------------------------------------
create or replace function public.pending_volunteers()
returns table (id uuid, email text, full_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.created_at
  from public.profiles p
  where public.is_admin()                       -- si no es admin, no devuelve filas
    and not exists (
      select 1 from public.volunteers v where v.user_id = p.id
    )
  order by p.created_at desc;
$$;
grant execute on function public.pending_volunteers to authenticated;

-- ------------------------------------------------------------
-- 6. RPCs de gestión (solo admin; validan rol internamente)
-- ------------------------------------------------------------

-- Aprobar a alguien como voluntario
create or replace function public.approve_volunteer(p_user_id uuid, p_role text default 'volunteer')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede aprobar voluntarios';
  end if;
  if p_role not in ('admin', 'volunteer') then
    raise exception 'Rol inválido';
  end if;
  insert into public.volunteers (user_id, name, role)
  select p.id, coalesce(p.full_name, p.email), p_role
  from public.profiles p where p.id = p_user_id
  on conflict (user_id) do update set role = excluded.role;
end $$;
grant execute on function public.approve_volunteer to authenticated;

-- Quitar a un voluntario (no permite que el admin se borre a sí mismo)
create or replace function public.remove_volunteer(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede quitar voluntarios';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes quitarte a ti mismo';
  end if;
  delete from public.volunteers where user_id = p_user_id;
end $$;
grant execute on function public.remove_volunteer to authenticated;

-- ------------------------------------------------------------
-- 7. BOOTSTRAP del primer admin (ÚNICO paso manual).
--    La persona debe haberse logueado al menos una vez.
--    Reemplaza el email por el del primer admin y ejecuta:
--
--   insert into public.volunteers (user_id, name, role)
--   select id, coalesce(raw_user_meta_data->>'full_name', email), 'admin'
--   from auth.users where email = 'CORREO_DEL_ADMIN@gmail.com'
--   on conflict (user_id) do update set role = 'admin';
-- ------------------------------------------------------------
