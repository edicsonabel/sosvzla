'use client';

import { useEffect, useRef } from 'react';

// Widget Cloudflare Turnstile. Llama onToken(token) cuando el usuario pasa el
// reto (invisible/managed). Si no hay site key configurada, NO se renderiza y
// el envío sigue funcionando sin captcha (útil en dev).
//
// El script se carga una sola vez. La validación real del token es server-side
// en /api/submit; aquí solo obtenemos el token.

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function turnstileEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    function render() {
      if (!ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
        theme: 'auto',
      });
    }

    if (window.turnstile) {
      render();
      return;
    }
    // Carga el script una vez.
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', render);
    return () => script?.removeEventListener('load', render);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} style={{ marginTop: '0.5rem' }} />;
}
