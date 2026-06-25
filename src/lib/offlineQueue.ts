// Cola offline simple sobre localStorage.
// En terremoto la red se cae: si no hay conexión, el reporte se guarda
// localmente y se reenvía automáticamente cuando vuelve la red.
import { supabase } from './supabase';

const KEY = 'sos_offline_queue';

type TableName = 'reports' | 'persons';

interface QueueItem {
  id: string;          // id local temporal
  table: TableName;
  payload: Record<string, unknown>;
  createdAt: number;
}

function read(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
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

// Intenta enviar a Supabase; si falla (sin red), encola.
export async function submitOrQueue(
  table: TableName,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; queued: boolean }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueue(table, payload);
    return { ok: true, queued: true };
  }
  const { error } = await supabase.from(table).insert(payload);
  if (error) {
    enqueue(table, payload);
    return { ok: true, queued: true };
  }
  return { ok: true, queued: false };
}

function enqueue(table: TableName, payload: Record<string, unknown>) {
  const items = read();
  items.push({
    id: `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    table,
    payload,
    createdAt: Date.now(),
  });
  write(items);
}

// Reenvía todo lo pendiente. Llamar al volver online.
export async function sync(): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;
  const remaining: QueueItem[] = [];
  let sent = 0;
  for (const item of items) {
    const { error } = await supabase.from(item.table).insert(item.payload);
    if (error) {
      remaining.push(item); // sigue pendiente
    } else {
      sent++;
    }
  }
  write(remaining);
  return sent;
}

// Engancha sincronización automática al recuperar red.
export function enableAutoSync(onSync?: (n: number) => void) {
  if (typeof window === 'undefined') return;
  const handler = async () => {
    const n = await sync();
    if (n > 0 && onSync) onSync(n);
  };
  window.addEventListener('online', handler);
  // intento inicial por si quedó algo pendiente
  if (navigator.onLine) handler();
}
