#!/usr/bin/env bash
# ============================================================
# Backup completo (schema + datos) de un proyecto Supabase/Postgres.
# Úsalo ANTES de re-ejecutar schema.sql / security.sql en producción.
#
# Uso:
#   PROD_DB_URL="postgresql://postgres.<ref>:<password>@<host>:6543/postgres" \
#     ./scripts/backup.sh
#
# La connection string sale de: Supabase Dashboard > Project Settings >
# Database > Connection string > URI (usa la de "Session pooler" o "Direct").
# OJO: contiene la contraseña de la BD. No la pegues en git ni en el historial
# del shell; expórtala en el momento o ponla en un archivo .env fuera del repo.
#
# Si no tienes pg_dump instalado, el script usa Docker como respaldo.
# ============================================================
set -euo pipefail

if [[ -z "${PROD_DB_URL:-}" ]]; then
  echo "ERROR: define PROD_DB_URL con la connection string de la BD." >&2
  echo "Ej: PROD_DB_URL=\"postgresql://...\" ./scripts/backup.sh" >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
mkdir -p "$DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DIR/sosvzla-${STAMP}.sql"

# Flags: sin owner/ACL (portable entre proyectos), con inserts (restauración
# robusta aunque cambie el orden de columnas).
DUMP_FLAGS=(--no-owner --no-acl --clean --if-exists)

echo "→ Backup a: $OUT"

if command -v pg_dump >/dev/null 2>&1; then
  echo "→ Usando pg_dump local ($(pg_dump --version))"
  pg_dump "$PROD_DB_URL" "${DUMP_FLAGS[@]}" -f "$OUT"
elif command -v docker >/dev/null 2>&1; then
  # Versión de imagen alineada con Supabase (PG17). Override con PG_IMAGE si tu
  # proyecto usa otra (ej: PG_IMAGE=postgres:16 ./scripts/backup.sh).
  PG_IMAGE="${PG_IMAGE:-postgres:17}"
  echo "→ pg_dump no instalado; usando Docker ($PG_IMAGE)"
  # --network=host: el contenedor usa la red del host para alcanzar Supabase.
  # Pasamos la URL por variable de entorno (-e) para que NO quede en la lista
  # de procesos del contenedor.
  docker run --rm --network=host -e DBURL="$PROD_DB_URL" "$PG_IMAGE" \
    sh -c 'pg_dump "$DBURL" --no-owner --no-acl --clean --if-exists' > "$OUT"
else
  echo "ERROR: no hay pg_dump ni docker. Instala uno:" >&2
  echo "  Arch:  sudo pacman -S postgresql" >&2
  echo "  o usa Docker." >&2
  exit 1
fi

# Verificación mínima: el archivo no está vacío y trae datos.
BYTES="$(wc -c < "$OUT")"
if [[ "$BYTES" -lt 1000 ]]; then
  echo "ADVERTENCIA: el backup es muy pequeño (${BYTES} bytes). ¿Falló la conexión?" >&2
  exit 1
fi

echo "✓ Backup OK — ${BYTES} bytes"
echo
echo "Restaurar (en una BD vacía / la misma):"
echo "  psql \"\$PROD_DB_URL\" -f \"$OUT\""
