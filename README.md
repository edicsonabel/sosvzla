# 🆘 SOS Venezuela

Plataforma solidaria de ayuda en emergencia (terremoto). PWA web: reporta SOS
geolocalizados, búscalos en un mapa en vivo, y busca/registra personas
desaparecidas o a salvo. Funciona aunque la red sea inestable (cola offline).

## Funciones

- **Reportar SOS** (`/sos`) — emergencia geolocalizada: médico, rescate, atrapado, agua/comida.
- **Mapa en vivo** (`/mapa`) — voluntarios ven los SOS por zona, color por estado, actualización en tiempo real.
- **Buscar personas** (`/buscar`) — buscar por nombre o reportar desaparecidos.
- **Estoy bien** (`/estoy-bien`) — avisar que estás a salvo.
- **Offline-first** — si no hay red, los reportes se guardan y se reenvían al reconectar.

## Stack

- Next.js 15 + TypeScript (PWA)
- Supabase (Postgres + PostGIS + Realtime)
- Leaflet + OpenStreetMap (mapas gratis, sin facturación)

## Puesta en marcha

1. **Instalar dependencias**
   ```bash
   pnpm install
   ```

2. **Crear proyecto en Supabase** (gratis) en https://supabase.com

3. **Cargar el esquema**: Supabase Dashboard → SQL Editor → pega y ejecuta
   `supabase/schema.sql`. (Crea tablas, geo, búsqueda de cercanos, RLS y datos demo.)

4. **Configurar variables**: copia `.env.local.example` a `.env.local` y rellena
   con la URL y la `anon key` (Dashboard → Project Settings → API).
   ```bash
   cp .env.local.example .env.local
   ```

5. **Arrancar**
   ```bash
   pnpm dev
   ```
   Abre http://localhost:3000

## Seguridad

Esto maneja datos de personas vulnerables en emergencia.

**Ya implementado** (en `supabase/security.sql` — ejecutar tras `schema.sql`):
- [x] Privacidad: el público lee de vistas `reports_public` / `persons_public` **sin campo contact**.
- [x] Moderación: reportes marcados `falso` quedan ocultos al público.
- [x] Rate limiting básico en BD: máx. 30 inserts anónimos/minuto (ajustable).
- [x] Rol voluntario (`public.voluntarios`): único que ve contacto, cambia estados y marca `falso`.

**Pendiente:**
- [ ] Pantalla de login + panel para voluntarios (Supabase Auth ya soportado en BD).
- [ ] CAPTCHA en inserts (reforzar rate limit por IP con Edge Function).
- [ ] Subida de fotos (Supabase Storage con límite de tamaño).
- [ ] Service Worker real para offline completo (ahora la cola es básica con localStorage).
- [ ] Ajustar el centro del mapa a la zona afectada (`src/app/mapa/ReportsMap.tsx`).

## Referentes (no reinventar la rueda)

- [Ushahidi](https://www.ushahidi.com/) — mapeo de crisis por reportes ciudadanos.
- [Sahana](https://sahanafoundation.org/) — gestión de desastres open source.
- Google Person Finder — buscar personas en desastres.

---
Hecho con solidaridad. Datos abiertos · ayuda mutua.
