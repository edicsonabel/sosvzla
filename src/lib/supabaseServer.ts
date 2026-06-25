import { createClient } from '@supabase/supabase-js';

// Cliente SOLO de servidor. Usa la SECRET KEY: nunca se importa en componentes
// 'use client'. Salta RLS, así que toda validación (captcha, rate-limit, campos
// permitidos) DEBE hacerse antes de insertar con este cliente.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

export function supabaseAdmin() {
  if (!url || !secret) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY en el entorno del servidor.');
  }
  return createClient(url, secret, { auth: { persistSession: false } });
}
