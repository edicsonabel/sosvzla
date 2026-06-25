# Política de seguridad

SOS Venezuela maneja datos de **personas vulnerables en una emergencia real**.
Una vulnerabilidad aquí puede exponer ubicaciones, contactos e identidades de
gente en peligro. Por eso nos tomamos la seguridad muy en serio.

## Reportar una vulnerabilidad

**No abras un issue público** para reportar una vulnerabilidad. Un reporte
público le da a un atacante el mapa antes de que podamos arreglarlo.

En su lugar:

1. Escribe en privado a **edicsonabelinfo@gmail.com** con el asunto
   `[SECURITY] SOS Venezuela`.
2. O usa el reporte privado de GitHub:
   **Security → Advisories → Report a vulnerability**.

Incluye, si puedes:

- Descripción de la vulnerabilidad y su impacto.
- Pasos para reproducirla (PoC si lo tienes).
- Versión / rama / URL afectada.

Te responderemos lo antes posible para confirmar la recepción y coordinar el
arreglo y la divulgación. Te pedimos un plazo razonable para corregir antes de
hacerlo público (divulgación coordinada).

## En alcance (especialmente sensible)

- Exposición del campo `contact` o de la `service_role` al público.
- Saltarse las vistas `reports_public` / `persons_public` para leer datos crudos.
- Saltarse el captcha o el rate-limit del route handler `/api/submit`.
- Filtración de secretos (`SUPABASE_SECRET_KEY`, `TURNSTILE_SECRET`).
- Escalada de privilegios en los roles `volunteer` / `admin`.
- Inyección SQL, XSS, o acceso a fotos de personas sin autorización.

## Buenas prácticas para contribuyentes

- Nunca commitees secretos. `.env.local` está en `.gitignore`; usa solo la
  *publishable key* en el front.
- El front anónimo lee **solo** de las vistas públicas, nunca de las tablas
  crudas.
- Todo insert anónimo pasa por `/api/submit` (captcha + rate-limit + whitelist).

Gracias por ayudar a mantener segura a la gente que depende de esta plataforma.
