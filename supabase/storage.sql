-- ============================================================
-- SOS Venezuela — Storage para fotos de desaparecidos
-- Ejecutar en Supabase SQL Editor (tras schema/security).
-- También se puede crear el bucket desde el dashboard (Storage).
-- ============================================================

-- Bucket público de fotos. 5 MB máx, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,                                   -- lectura pública (mostrar fotos)
  5242880,                                -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- Políticas de acceso al bucket 'photos'
-- ------------------------------------------------------------

-- Lectura pública (cualquiera ve las fotos)
drop policy if exists "photos_public_read" on storage.objects;
create policy "photos_public_read" on storage.objects
  for select using (bucket_id = 'photos');

-- Subida pública anónima (emergencia: familiar sube foto sin login).
-- Restringida a la carpeta 'missing/' del bucket.
drop policy if exists "photos_public_upload" on storage.objects;
create policy "photos_public_upload" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'missing'
  );

-- Solo voluntarios pueden borrar (moderación de contenido).
drop policy if exists "photos_volunteer_delete" on storage.objects;
create policy "photos_volunteer_delete" on storage.objects
  for delete using (
    bucket_id = 'photos' and public.is_volunteer()
  );

-- ------------------------------------------------------------
-- NOTA seguridad/abuso (pendiente reforzar):
--  - El tamaño y mime los valida el bucket (arriba).
--  - Añadir escaneo de contenido / moderación si escala.
--  - Considerar rate limit de subidas por IP (Edge Function).
-- ------------------------------------------------------------
