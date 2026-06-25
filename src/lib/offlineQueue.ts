// Cola offline sobre localStorage.
// En terremoto la red se cae: si no hay conexión (o el envío falla por red),
// el reporte se guarda localmente y se reenvía automáticamente.
//
// Endurecimientos vs versión inicial:
//  - Reintento periódico con backoff: no dependemos solo del evento 'online'.
//    Si el insert falla por timeout/500 con red presente, igual se reintenta.
//  - Lock en memoria contra envíos concurrentes (sync manual + auto-sync no
//    duplican el mismo item).
//  - Distingue error de red (reintentar) de error de servidor de validación
//    (descartar tras varios intentos para no reintentar para siempre).
//
// El insert NO va directo a Supabase: pasa por /api/submit (captcha +
// rate-limit por IP). El token de captcha solo aplica al envío en vivo; los
// reenvíos de la cola van con replay=true (sin token).

const KEY = 'sos_offline_queue';
const ENDPOINT = '/api/submit';
const MAX_ATTEMPTS = 8; // tras esto, el item se considera fallido permanente

type TableName = 'reports' | 'persons';

interface QueueItem {
  id: string; // id local temporal
  table: TableName;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

let syncing = false; // lock global: un solo sync a la vez
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function read(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const items = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function write(items: QueueItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function pendingCount(): number {
  return read().length;
}

// Genera un id local único (evita colisiones aunque se llame en el mismo ms).
function localId(): string {
  return `local-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

interface SubmitError {
  message: string;
  status?: number; // status HTTP si hubo respuesta del servidor
  network?: boolean; // true si ni siquiera llegó (sin red)
}

// Llama a /api/submit. Distingue: ok / error de validación (no reintentar) /
// error de red o rate-limit (reintentar).
async function postSubmit(
  table: TableName,
  payload: Record<string, unknown>,
  opts: { token?: string; replay?: boolean }
): Promise<{ ok: true } | { ok: false; error: SubmitError }> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ table, payload, token: opts.token, replay: opts.replay }),
    });
  } catch {
    return { ok: false, error: { message: 'Sin conexión.', network: true } };
  }
  if (res.ok) return { ok: true };
  let message = 'No se pudo enviar.';
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) message = data.error;
  } catch {
    /* respuesta sin cuerpo */
  }
  return { ok: false, error: { message, status: res.status } };
}

// ¿El error es reintentable (red / rate-limit / 5xx) vs permanente (validación)?
function isRetryable(error: SubmitError): boolean {
  if (error.network) return true;
  if (error.status === 429) return true; // rate-limit: reintentar luego
  if (error.status && error.status >= 500) return true; // server caído
  // 400/403 (validación, captcha) NO se reintentan.
  return false;
}

function enqueue(table: TableName, payload: Record<string, unknown>) {
  const items = read();
  items.push({ id: localId(), table, payload, createdAt: Date.now(), attempts: 0 });
  write(items);
  scheduleRetry();
}

// Intenta enviar vía /api/submit; si falla por red, encola.
// `token` es el del captcha Turnstile (solo envío en vivo).
export async function submitOrQueue(
  table: TableName,
  payload: Record<string, unknown>,
  token?: string
): Promise<{ ok: boolean; queued: boolean; error?: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueue(table, payload);
    return { ok: true, queued: true };
  }
  const res = await postSubmit(table, payload, { token });
  if (res.ok) return { ok: true, queued: false };

  // Falló: si es reintentable (red/rate-limit/5xx) lo encolamos; si es
  // validación o captcha, devolvemos el error para que el formulario lo muestre.
  if (isRetryable(res.error)) {
    enqueue(table, payload);
    return { ok: true, queued: true };
  }
  return { ok: false, queued: false, error: res.error.message };
}

// Reenvía todo lo pendiente. Idempotente vía lock; seguro de llamar a menudo.
export async function sync(): Promise<number> {
  if (syncing) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  syncing = true;
  try {
    const items = read();
    if (items.length === 0) return 0;
    const remaining: QueueItem[] = [];
    let sent = 0;

    for (const item of items) {
      // replay=true: la cola reenvía sin token de captcha (igual pasa por
      // el rate-limit por IP del servidor).
      const res = await postSubmit(item.table, item.payload, { replay: true });
      if (res.ok) {
        sent++;
        continue;
      }
      const attempts = item.attempts + 1;
      // Descartamos si superó intentos, o si el error no es reintentable.
      if (attempts >= MAX_ATTEMPTS || !isRetryable(res.error)) {
        // se cae del array (no se reintenta más)
        continue;
      }
      remaining.push({ ...item, attempts });
    }

    write(remaining);
    if (remaining.length > 0) scheduleRetry();
    return sent;
  } finally {
    syncing = false;
  }
}

// Programa un reintento con backoff (5s → tope 60s según cuántos intentos lleva).
function scheduleRetry(onSync?: (n: number) => void) {
  if (typeof window === 'undefined' || retryTimer) return;
  const items = read();
  if (items.length === 0) return;
  const maxAttempts = items.reduce((m, i) => Math.max(m, i.attempts), 0);
  const delay = Math.min(5000 * 2 ** maxAttempts, 60000);
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    const n = await sync();
    if (n > 0 && onSync) onSync(n);
    if (read().length > 0) scheduleRetry(onSync); // sigue pendiente → reprograma
  }, delay);
}

// Engancha sincronización automática: al recuperar red y por timer de respaldo.
export function enableAutoSync(onSync?: (n: number) => void) {
  if (typeof window === 'undefined') return;
  const handler = async () => {
    const n = await sync();
    if (n > 0 && onSync) onSync(n);
    if (read().length > 0) scheduleRetry(onSync);
  };
  window.addEventListener('online', handler);
  // intento inicial + arranca el timer de respaldo si quedó algo pendiente
  if (navigator.onLine) handler();
  else scheduleRetry(onSync);
}
