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
  lat: number;
  lng: number;
  photo_url: string | null;
  contact: string | null;
  status: ReportStatus;
  created_at: string;
}

export type PersonStatus = 'missing' | 'safe' | 'found';

export interface Person {
  id: string;
  name: string;
  status: PersonStatus;
  last_seen: string | null;
  description: string | null;
  photo_url: string | null;
  reported_by: string | null;
  contact: string | null;
  created_at: string;
}
