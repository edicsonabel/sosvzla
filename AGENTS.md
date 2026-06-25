# AGENTS.md — SOS Venezuela

Guía para agentes de IA (y personas) que trabajen en este repositorio. Léela
antes de hacer cambios. Resume decisiones que NO son obvias desde el código.

---

## Qué es este proyecto

PWA solidaria de respuesta a emergencia, creada tras un terremoto en Venezuela.
Permite a cualquier persona:
- Reportar un **SOS geolocalizado** (médico, rescate, atrapado, agua/comida).
- Ver esos reportes en un **mapa en vivo** (voluntarios/rescatistas).
- **Buscar/registrar personas** desaparecidas o avisar que está a salvo.

Manejamos datos de **personas vulnerables en una crisis real**. Prioriza
siempre: seguridad de los datos, accesibilidad, y que funcione con red mala.

- **Dominio de producción:** `sosvzla.com`
- **Idioma de la UI:** español (Venezuela). Textos claros y directos.

### Convención de idioma (IMPORTANTE)

- **Código y base de datos en INGLÉS**: nombres de tablas, columnas, valores
  enum, funciones SQL, variables, funciones y archivos JS/TS. Sin excepciones.
- **Español** solo en: textos visibles al usuario (UI), comentarios de código,
  y las rutas de URL (`/sos`, `/mapa`, `/buscar`, `/estoy-bien`, `/voluntarios`
  — son cara al usuario; NO renombrar, romperían enlaces).

---

## ⛔ Reglas que NO se rompen

1. **NUNCA usar rojo en la UI.** En Venezuela el rojo se asocia al chavismo;
   el proyecto debe ser apolítico. Tampoco combinar verde + rojo + amarillo
   (bandera). Decisión explícita del dueño del proyecto.
2. **NUNCA exponer el campo `contact`** (ni `service_role`) al público. El
   frontend anónimo lee de las **vistas** `reports_public` / `persons_public`,
   que no incluyen contacto. Solo voluntarios autenticados ven datos crudos.
3. **NUNCA commitear secretos.** `.env.local` está en `.gitignore`. Usar solo
   la *publishable key* (`sb_publishable_…`) en el front; la *secret key* jamás
   toca el cliente.
4. **El insert anónimo debe seguir funcionando sin login** — es una emergencia.
   No añadir auth obligatoria a `/sos`, `/buscar`, `/estoy-bien`.

---

## Paleta y diseño

Concepto: **"utilitario humanitario"** — serio, alto contraste, legible bajo el
sol y en pantallas baratas. Nada de aspecto "AI-slop" ni juguete.

| Token | Valor | Uso |
|-------|-------|-----|
| `--primario` | `#0b3d66` azul rescate | acción principal |
| `--acento` | `#14b8a6` teal | acentos, foco, estado pendiente |
| `--ambar` | `#f59e0b` | SOLO estado "en camino" |
| `--verde` | `#16a34a` | estado "resuelto" / "seguro" |

- Tema **claro y oscuro automático** (`prefers-color-scheme`). No romper ninguno.
- Tipografía: **Archivo** (display), **Public Sans** (body), **Sometype Mono**
  (etiquetas/datos). No usar Inter/Roboto/Arial.
- Todos los tokens viven en `src/app/globals.css` (`:root` y el bloque dark).
  Cambiar colores ahí, no inline.
- Respetar `prefers-reduced-motion` (ya hay un reset al final del CSS).

---

## Stack y comandos

- **Next.js 15** (App Router) + **TypeScript** (strict).
- **Bun** como gestor/runtime — NO usar npm/pnpm/yarn.
- **Supabase**: Postgres + PostGIS (geo) + Realtime + Auth + Storage.
- **Leaflet + OpenStreetMap** para mapas (sin Google Maps → sin facturación).
- Deploy: **Vercel**, DNS en **Cloudflare**.

```bash
bun install        # dependencias
bun run dev        # desarrollo (http://localhost:3000)
bun run build      # build de producción
```

Variables de entorno (`.env.local`, copiar de `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### Entornos (dos proyectos Supabase)

- **DEV** (`yozkrp...`) — usado en local. `.env.local` apunta aquí.
- **PROD** (`epppdh...`) — usado en Vercel. Configurar las mismas variables
  (sin sufijo) en Vercel → Project Settings → Environment Variables.

El código SIEMPRE lee `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` sin sufijo; cada
entorno las apunta al proyecto correcto. No hay lógica de selección en código.
**Ejecutar `schema.sql` + `security.sql` en AMBOS proyectos.** Borrar los datos
demo solo en PROD.

---

## Estructura

```
src/
  app/
    layout.tsx          # shell, nav, metadata, theme-color (claro/oscuro)
    page.tsx            # home
    globals.css         # SISTEMA DE DISEÑO completo (tokens, componentes)
    sos/page.tsx        # reportar SOS (geolocalización + offline)
    mapa/
      page.tsx          # wrapper (dynamic import, sin SSR)
      ReportsMap.tsx    # mapa Leaflet, lee de vista reports_public, polling 15s
    buscar/page.tsx     # buscar/reportar desaparecidos
    estoy-bien/page.tsx # avisar "a salvo"
    voluntarios/
      page.tsx          # login / guard de rol
      VolunteerPanel.tsx # panel de coordinación
  lib/
    supabase.ts         # cliente + tipos (Report, Person)
    offlineQueue.ts     # cola offline (submitOrQueue/sync) + auto-sync al reconectar
    useSession.ts       # hook sesión + rol volunteer
supabase/
  schema.sql            # tablas, geo, RPC, RLS base, datos demo
  security.sql          # vistas públicas, rol voluntario, rate limit, RLS dura
public/
  manifest.json, icon.svg
```

**Orden de SQL en Supabase:** `schema.sql` primero, luego `security.sql`.
Para **recargar** un esquema cambiado, ejecutar antes `reset.sql` (idempotente,
borra versiones español e inglés) → luego schema → security. En DEV resetea
libre; en PROD nunca `reset.sql` con datos reales sin exportar antes.

---

## Modelo de datos

- `reports` — reporte de emergencia. `geo` (geography) se rellena por trigger
  desde `lat`/`lng`. `status`: `pending` → `dispatched` → `resolved` (o
  `false_report`). `type`: `medical`/`rescue`/`trapped`/`water_food`/`other`.
- `persons` — desaparecidos / a salvo. `status`: `missing`, `safe`, `found`.
- `volunteers` — usuarios con permiso de moderar (ver `security.sql`).
- **Vistas públicas:** `reports_public`, `persons_public` (sin `contact`, sin
  `false_report`). El front anónimo SIEMPRE lee de estas.

---

## Patrones a respetar

- **Offline-first:** todo insert pasa por `submitOrQueue()` de
  `lib/offlineQueue.ts`. Si no hay red, se guarda y se reenvía al reconectar.
  No insertar directo con `supabase.from(...).insert()` desde un formulario.
- **Mapa:** Leaflet usa `window` → debe cargarse con `dynamic(..., { ssr:false })`.
  No importar `react-leaflet` en un componente con SSR.
- **Lectura pública:** usar vistas `*_public`, nunca las tablas crudas (RLS las
  bloquea para anónimos de todas formas).
- Tipos en `lib/supabase.ts`; no duplicar interfaces.

---

## Panel de voluntarios

Ruta `/voluntarios`. Login con **Google OAuth** (`signInWithOAuth({provider:'google'})`).
Requiere config externa: (1) Google Cloud → OAuth client ID web, redirect URI
`https://<ref>.supabase.co/auth/v1/callback` por cada proyecto; (2) Supabase →
Authentication → Providers → Google (pegar client id/secret); (3) Supabase →
Authentication → URL Configuration → Site URL + Redirect URLs (`/voluntarios`).
- `lib/useSession.ts` — hook: sesión + comprueba rol contra tabla `volunteers`.
- `voluntarios/page.tsx` — login / "sin permiso" / panel según estado.
- `voluntarios/VolunteerPanel.tsx` — lista reports crudos (con contact), Realtime,
  cambia status (dispatched/resolved/reabrir/false_report), filtros por estado.

Dar de alta un voluntario: tras su primer login, `insert into public.volunteers
(user_id, name) values ('<uuid>', 'Nombre')`. El uuid sale de Auth → Users.
**Requiere habilitar Realtime** para la tabla `reports` en Supabase (Database →
Replication) para que el panel se actualice en vivo; si no, recarga al cambiar.

## Antes de producción (pendiente)

- [ ] CAPTCHA / rate-limit por IP en inserts (hoy hay límite básico en BD).
- [ ] Subida de fotos (Supabase Storage con límite de tamaño + validación).
- [ ] Service Worker real para offline completo (hoy la cola es localStorage).
- [ ] Ajustar el centro del mapa a la zona afectada (`ReportsMap.tsx`, const `CENTER`).
- [ ] Borrar los datos demo de `schema.sql` en producción.

---

## Al terminar un cambio

1. `bun run build` debe pasar limpio.
2. Si tocaste UI, verifica **claro y oscuro** y que **no haya rojo**.
3. Si tocaste lectura de datos, confirma que el público **no ve `contact`**.
4. No commitear `.env.local` ni `.next/`.
