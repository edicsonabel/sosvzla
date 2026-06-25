'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

// Cuenta visitas de página (privacy-first): manda solo el path, sin query
// string ni hash, sin IP ni identificador. Se dispara en cada cambio de ruta.
// No renderiza nada.
export default function PageViewTracker() {
  const pathname = usePathname();

  // Visitante único por pestaña: marca en sessionStorage para no contar dos
  // veces la misma sesión. Sin IP ni cookie persistente (privacy-first): al
  // cerrar la pestaña, sessionStorage se borra y una nueva visita cuenta otra
  // vez. Esto distingue "visitantes" de "pageviews" (cada carga).
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('sos_session')) {
        sessionStorage.setItem('sos_session', '1');
        track('session_start');
      }
    } catch {
      // Sin sessionStorage (modo privado estricto): no rompemos nada.
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;
    // Solo el path: nada de ?q=... que podría llevar términos sensibles.
    track('page_view', { path: pathname });
  }, [pathname]);

  return null;
}
