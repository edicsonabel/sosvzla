import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://sosvzla.com';

// Revalidar el sitemap cada hora: las personas reportadas cambian seguido.
export const revalidate = 3600;

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon';
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/sos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/buscar`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/mapa`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/estoy-bien`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/emergencias`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Páginas públicas por persona, para que sean indexables y difundibles.
  let personRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await serverClient()
      .from('persons_public')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (data) {
      personRoutes = data.map((p: { id: string; created_at: string }) => ({
        url: `${BASE}/p/${p.id}`,
        lastModified: p.created_at ? new Date(p.created_at) : undefined,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Si Supabase no responde en build, servimos solo las rutas estáticas.
  }

  return [...staticRoutes, ...personRoutes];
}
