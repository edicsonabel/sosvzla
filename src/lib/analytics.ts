import { supabase } from './supabase';

// Analítica propia, privacy-first (ver supabase/analytics.sql).
// No mandamos PII, ni IP, ni identificador de usuario: solo el nombre del
// evento (validado contra whitelist en el servidor) y props no sensibles.
//
// Nunca revienta el flujo del usuario: si falla, se ignora en silencio.

export type EventName =
  | 'page_view'
  | 'session_start'
  | 'report_created'
  | 'person_reported'
  | 'search_performed'
  | 'map_viewed'
  | 'report_shared'
  | 'person_found_claim';

export type EventProps = Record<string, string | number | boolean>;

export async function track(name: EventName, props: EventProps = {}): Promise<void> {
  try {
    await supabase.rpc('track_event', { p_name: name, p_props: props });
  } catch {
    // Analítica nunca debe afectar la experiencia. Silencio.
  }
}

// Conteo por nombre de evento devuelto por analytics_summary.
export type EventCounts = Partial<Record<EventName, number>>;

// Una fila de la serie diaria: el día + un conteo por evento.
export type DailyRow = { day: string } & EventCounts;

// Resumen agregado de la analítica (privacy-first): solo totales y series,
// nunca filas crudas. Lo sirve la RPC pública analytics_summary().
export interface AnalyticsSummary {
  totals: EventCounts;
  last7d: EventCounts;
  last30d: EventCounts;
  daily: DailyRow[];
  by_type: Record<string, number>;
  by_channel: Record<string, number>;
  generated_at: string;
}

// Lee los agregados públicos. Devuelve null si falla (la UI muestra vacío).
export async function fetchSummary(): Promise<AnalyticsSummary | null> {
  try {
    const { data, error } = await supabase.rpc('analytics_summary');
    if (error || !data) return null;
    return data as AnalyticsSummary;
  } catch {
    return null;
  }
}

// Conteo por estado de las personas reportadas (tabla persons real, no
// eventos). Lo sirve la RPC pública persons_stats().
export interface PersonsStats {
  total: number;
  missing: number; // aún sin contacto
  safe: number; // localizadas a salvo (safe + found)
  found_pending: number; // "lo encontré" por confirmar
}

export async function fetchPersonsStats(): Promise<PersonsStats | null> {
  try {
    const { data, error } = await supabase.rpc('persons_stats');
    if (error || !data) return null;
    return data as PersonsStats;
  } catch {
    return null;
  }
}
