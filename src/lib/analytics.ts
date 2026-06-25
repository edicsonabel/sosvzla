import { supabase } from './supabase';

// Analítica propia, privacy-first (ver supabase/analytics.sql).
// No mandamos PII, ni IP, ni identificador de usuario: solo el nombre del
// evento (validado contra whitelist en el servidor) y props no sensibles.
//
// Nunca revienta el flujo del usuario: si falla, se ignora en silencio.

export type EventName =
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
