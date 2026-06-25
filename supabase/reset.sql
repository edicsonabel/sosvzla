-- ============================================================
-- SOS Venezuela — RESET de esquema
-- Borra TODO lo creado por versiones anteriores (nombres en español
-- e inglés) para empezar limpio. Ejecutar en Supabase SQL Editor
-- ANTES de volver a correr schema.sql + security.sql.
--
-- ⚠️ DESTRUCTIVO: elimina tablas y TODOS sus datos. En producción,
-- exporta antes si hay datos reales que conservar.
-- ============================================================

-- NOTA: los triggers se eliminan automáticamente al hacer DROP TABLE ... CASCADE
-- más abajo. No se listan aquí porque `DROP TRIGGER ... ON tabla` falla si la
-- tabla no existe (el `if exists` aplica al trigger, no a la tabla).

-- ---- Vistas ----
drop view if exists public.sos_publico cascade;
drop view if exists public.personas_publico cascade;
drop view if exists public.reports_public cascade;
drop view if exists public.persons_public cascade;

-- ---- Funciones (versión vieja español + nueva inglés) ----
drop function if exists public.sos_set_geo() cascade;
drop function if exists public.set_report_geo() cascade;
drop function if exists public.sos_cercanos(double precision, double precision, double precision) cascade;
drop function if exists public.sos_cercanos_publico(double precision, double precision, double precision) cascade;
drop function if exists public.nearby_reports(double precision, double precision, double precision) cascade;
drop function if exists public.nearby_reports_public(double precision, double precision, double precision) cascade;
drop function if exists public.es_voluntario() cascade;
drop function if exists public.is_volunteer() cascade;
drop function if exists public.check_rate_limit() cascade;

-- ---- Tablas (cascade borra políticas, índices, datos) ----
drop table if exists public.sos cascade;
drop table if exists public.personas cascade;
drop table if exists public.voluntarios cascade;
drop table if exists public.reports cascade;
drop table if exists public.persons cascade;
drop table if exists public.volunteers cascade;
drop table if exists public.rate_buckets cascade;

-- Listo. Ahora ejecuta schema.sql y luego security.sql.
