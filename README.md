# 🆘 SOS Venezuela

Plataforma solidaria de ayuda en emergencia (terremoto). PWA web: reporta SOS
geolocalizados, búscalos en un mapa en vivo, y busca/registra personas
desaparecidas o a salvo. Funciona aunque la red sea inestable (cola offline +
service worker).

> Para desarrollar en este repo, lee primero **[AGENTS.md](AGENTS.md)** — recoge
> las decisiones no obvias (paleta, reglas que no se rompen, modelo de datos).

## Funciones

- **Reportar SOS** (`/sos`) — emergencia geolocalizada: médico, rescate, atrapado, agua/comida. El GPS es opcional (referencia escrita si falla).
- **Mapa en vivo** (`/mapa`) — voluntarios ven los SOS por zona, color por estado, actualización por polling.
- **Buscar personas** (`/buscar`) — buscar por nombre o reportar desaparecidos, con foto y cédula. Cards tipo cartel + modal de detalle.
- **Estoy bien** (`/estoy-bien`) — avisar que estás a salvo.
- **Seguir un SOS** (`/r/[id]`) — la familia abre el enlace y ve el estado en vivo.
- **Difundir una persona** (`/p/[id]`) — página pública por persona, con vista previa (foto + nombre + estado) al pegar el enlace en WhatsApp/redes.
- **Emergencias** (`/emergencias`) — directorio de números nacionales (marcado `tel:`).
- **Voluntarios** (`/voluntarios`) y **Admin** (`/admin`) — paneles autenticados (Google OAuth).
- **Bilingüe** ES/EN, **tema claro/oscuro** (automático o manual).
- **Offline-first** — si no hay red, los reportes se guardan y se reenvían al reconectar (cola + service worker).

## Stack

- **Next.js 16** (App Router) + TypeScript strict (PWA)
- **Supabase** — Postgres + PostGIS + Realtime + Auth + Storage
- **Leaflet + OpenStreetMap** (mapas gratis, sin facturación)
- **Cloudflare Turnstile** (captcha) + rate-limit por IP en el route handler
- Deploy: **Vercel**, DNS en **Cloudflare**. Dominio: `sosvzla.com`

## Puesta en marcha

Usa **Bun** como gestor/runtime (NO npm/pnpm/yarn).

1. **Instalar dependencias**
   ```bash
   bun install
   ```

2. **Crear proyecto en Supabase** (gratis) en https://supabase.com

3. **Cargar el esquema** (Supabase Dashboard → SQL Editor), en este orden:
   `schema.sql` → `security.sql` → `admin.sql` → `storage.sql`.
   (Tablas, geo, RPC, vistas públicas, rol voluntario/admin, rate limit, bucket de fotos.)

4. **Configurar variables**: copia `.env.local.example` a `.env.local` y rellena.
   ```bash
   cp .env.local.example .env.local
   ```
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=...               # solo servidor
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=...    # vacío en dev → captcha omitido
   TURNSTILE_SECRET=...
   ```

5. **Arrancar**
   ```bash
   bun run dev
   ```
   Abre http://localhost:3000

## Seguridad

Esto maneja datos de personas vulnerables en emergencia.

- **Privacidad:** el público lee de vistas `reports_public` / `persons_public` **sin campo `contact`**. Solo voluntarios autenticados ven datos crudos.
- **Moderación:** reportes marcados `false_report` quedan ocultos al público.
- **Inserts anónimos:** no van directo a Supabase — pasan por el route handler `/api/submit`, que verifica el captcha (Turnstile), aplica rate-limit por IP (`bump_ip_rate`) e inserta con la *secret key* tras filtrar el payload por whitelist.
- **Roles:** `volunteers` con rol `volunteer` / `admin`. El admin aprueba voluntarios.
- **Secretos:** `.env.local` en `.gitignore`. La *secret key* jamás toca el cliente; el front usa solo la *publishable key*.

## Pendiente (antes de producción)

- [ ] Ajustar el centro del mapa a la zona afectada (`src/app/mapa/ReportsMap.tsx`, const `CENTER`).
- [ ] Borrar los datos demo de `schema.sql` en producción.
- [ ] Crear widget Turnstile en Cloudflare y cargar las env en Vercel.

## Referentes (no reinventar la rueda)

- [Ushahidi](https://www.ushahidi.com/) — mapeo de crisis por reportes ciudadanos.
- [Sahana](https://sahanafoundation.org/) — gestión de desastres open source.
- Google Person Finder — buscar personas en desastres.

---
Hecho con solidaridad. Datos abiertos · ayuda mutua.
