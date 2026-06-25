import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // No reventamos en build; avisamos en runtime.
  console.warn('Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY. Copia .env.local.example a .env.local');
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'anon');

export type ReportStatus = 'pending' | 'dispatched' | 'resolved' | 'false_report';
export type ReportType = 'medical' | 'rescue' | 'trapped' | 'water_food' | 'other';

export interface Report {
  id: string;
  type: ReportType;
  description: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  contact: string | null;
  status: ReportStatus;
  created_at: string;
}

export type PersonStatus = 'missing' | 'safe' | 'found';

export interface Person {
  id: string;
  name: string;
  document_id: string | null;
  status: PersonStatus;
  last_seen: string | null;
  description: string | null;
  photo_url: string | null;
  reported_by: string | null;
  contact: string | null;
  created_at: string;
}

// Editar un reporte propio: el reportante reenvía su cédula (clave). El RPC
// la hashea en servidor y compara con editor_doc_hash. Devuelve la fila
// pública actualizada o un error si la cédula no coincide.
export interface PersonEdit {
  name: string;
  document_id: string;
  last_seen: string;
  description: string;
  contact: string;
  photo_url: string;
}

export async function updatePersonSelf(
  id: string,
  editorDoc: string,
  fields: PersonEdit
): Promise<{ person: Person | null; error: string | null }> {
  const { data, error } = await supabase.rpc('update_person_self', {
    p_id: id,
    p_editor_doc: editorDoc,
    p_name: fields.name,
    p_document_id: fields.document_id,
    p_last_seen: fields.last_seen,
    p_description: fields.description,
    p_contact: fields.contact,
    p_photo_url: fields.photo_url,
  });
  if (error) {
    return { person: null, error: error.message };
  }
  return { person: data as Person, error: null };
}
