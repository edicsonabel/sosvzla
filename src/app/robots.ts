import type { MetadataRoute } from 'next';

const BASE = 'https://sosvzla.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Rutas privadas o con auth: no rastrear.
      disallow: ['/admin', '/voluntarios', '/r/', '/api/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
