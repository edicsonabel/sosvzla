import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

// Inserta reports/persons del público anónimo, con dos defensas:
//  1. Captcha Cloudflare Turnstile (en el envío en vivo).
//  2. Rate-limit POR IP (no global), para que un solo abusador no bloquee
//     a todos. Se cuenta en la tabla rate_buckets, ventana de 1 minuto.
//
// Nota offline: los reportes encolados se reenvían sin token de captcha
// (replay=true). Igual pasan por el rate-limit por IP, así que el abuso
// sigue acotado; el captcha solo protege la ruta en vivo.

export const runtime = 'nodejs';

const RATE_MAX = 12;          // inserts por IP por minuto
const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Solo estos campos pueden venir del cliente. La secret key salta RLS, así que
// jamás insertamos un payload crudo: lo filtramos a campos conocidos.
const ALLOWED: Record<string, string[]> = {
  reports: ['type', 'description', 'contact', 'lat', 'lng', 'photo_url'],
  persons: ['name', 'document_id', 'status', 'last_seen', 'description', 'contact', 'photo_url', 'reported_by', 'editor_doc_hash'],
};

const REPORT_TYPES = ['medical', 'rescue', 'trapped', 'water_food', 'other'];
const PERSON_STATUS = ['missing', 'safe', 'found'];

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function pick(payload: Record<string, unknown>, table: 'reports' | 'persons') {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED[table]) {
    if (payload[k] !== undefined) out[k] = payload[k];
  }
  return out;
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true; // sin secret configurado, no bloqueamos (dev)
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch(TURNSTILE_VERIFY, { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// Rate-limit por IP usando rate_buckets (window_start + ip). Devuelve true si OK.
async function withinRateLimit(admin: ReturnType<typeof supabaseAdmin>, ip: string): Promise<boolean> {
  const { data, error } = await admin.rpc('bump_ip_rate', { p_ip: ip, p_max: RATE_MAX });
  if (error) return true; // si la función no existe aún, no bloqueamos
  return data === true;
}

export async function POST(req: NextRequest) {
  let parsed: { table?: string; payload?: Record<string, unknown>; token?: string; replay?: boolean };
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const { table, payload, token, replay } = parsed;
  if (table !== 'reports' && table !== 'persons') {
    return NextResponse.json({ error: 'Tabla no permitida.' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Payload requerido.' }, { status: 400 });
  }

  const ip = clientIp(req);

  // Captcha solo en envío en vivo, y solo si Turnstile está configurado.
  // Sin TURNSTILE_SECRET (dev / no configurado), se omite por completo: no
  // se exige token. Los reenvíos de la cola (replay) también lo omiten.
  const captchaOn = !!process.env.TURNSTILE_SECRET;
  if (captchaOn && !replay) {
    if (!token || !(await verifyTurnstile(token, ip))) {
      return NextResponse.json({ error: 'Verificación anti-spam fallida. Recarga e intenta.' }, { status: 403 });
    }
  }

  const admin = supabaseAdmin();

  if (!(await withinRateLimit(admin, ip))) {
    return NextResponse.json(
      { error: 'Demasiados envíos desde tu red. Espera un minuto e intenta.' },
      { status: 429 }
    );
  }

  const clean = pick(payload, table);

  // Validación mínima de campos críticos (la secret key salta RLS/checks).
  if (table === 'reports' && !REPORT_TYPES.includes(String(clean.type))) {
    return NextResponse.json({ error: 'Tipo de reporte inválido.' }, { status: 400 });
  }
  if (table === 'persons') {
    if (!clean.name || String(clean.name).trim() === '') {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }
    if (clean.status && !PERSON_STATUS.includes(String(clean.status))) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }
  }

  const { error } = await admin.from(table).insert(clean);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
