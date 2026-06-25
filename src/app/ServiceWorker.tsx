'use client';

import { useEffect } from 'react';

// Registra el Service Worker (solo en producción y si el navegador lo soporta).
// En dev se omite para no interferir con el hot-reload de Next.
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencioso: la app sigue funcionando sin SW.
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
