# Cómo contribuir a SOS Venezuela

Gracias por querer ayudar. 🙏 Este es un proyecto solidario, sin fines de
lucro, que maneja datos de **personas vulnerables en una emergencia real**. Tu
contribución puede ayudar a salvar vidas, así que cuidamos mucho la calidad y la
seguridad.

> **Antes de tocar código, lee [AGENTS.md](AGENTS.md).** Recoge las decisiones
> que NO son obvias desde el código: paleta, reglas que no se rompen, modelo de
> datos, convención de idioma. No repetimos todo eso aquí.

---

## Formas de contribuir

No hace falta saber programar para ayudar:

- **Reportar un bug** — abre un [issue](../../issues/new/choose) con el template de bug.
- **Proponer una mejora** — abre un issue con el template de feature.
- **Traducir / corregir textos** — ES (Venezuela) y EN.
- **Mejorar accesibilidad** — esto se usa bajo estrés, con redes malas y pantallas baratas.
- **Documentación** — README, AGENTS.md, esta guía.
- **Código** — corregir bugs, añadir funciones (mira los issues abiertos primero).

---

## Reglas que NO se rompen (resumen)

Estas son innegociables. El detalle completo está en
[AGENTS.md](AGENTS.md#-reglas-que-no-se-rompen):

1. **NUNCA usar rojo en la UI** (asociación política en Venezuela). Tampoco
   combinar verde + rojo + amarillo (bandera). El proyecto es apolítico.
2. **NUNCA exponer el campo `contact`** ni la `service_role` al público. El
   front anónimo lee solo de las vistas `reports_public` / `persons_public`.
3. **NUNCA commitear secretos.** Usa solo la *publishable key* en el front; la
   *secret key* jamás toca el cliente. `.env.local` está en `.gitignore`.
4. **El insert anónimo debe funcionar sin login** — es una emergencia. No
   añadas auth obligatoria a `/sos`, `/buscar`, `/estoy-bien`.
5. **Código y base de datos en inglés**; español solo en UI, comentarios y
   rutas cara al usuario.

Un PR que rompa cualquiera de estas será rechazado, sin importar lo bien escrito
que esté.

---

## Puesta en marcha (entorno local)

Usamos **Bun** (NO npm/pnpm/yarn).

```bash
bun install
cp .env.local.example .env.local   # rellena con tu proyecto Supabase de dev
bun run dev                        # http://localhost:3000
```

El esquema de la base de datos está en `supabase/`. Cárgalo en este orden:
`schema.sql` → `security.sql` → `admin.sql` → `storage.sql`. Detalle en el
[README](README.md#puesta-en-marcha).

---

## Flujo de trabajo (Pull Request)

1. **Haz fork** del repo y clónalo.
2. **Crea una rama** desde `main` con nombre descriptivo:
   ```bash
   git checkout -b fix/mapa-centro-zona
   ```
3. **Haz tus cambios.** Mantén el PR enfocado en una sola cosa.
4. **Verifica antes de subir:**
   ```bash
   bun run lint    # sin errores de lint
   bun run build   # compila sin errores (TypeScript strict)
   ```
   Prueba a mano la pantalla que tocaste, incluyendo **modo oscuro** y **móvil**.
5. **Commitea** siguiendo la convención (abajo).
6. **Abre el PR** contra `main`. Rellena el template: qué cambia, por qué, cómo
   probarlo, capturas si es UI.
7. Responde a la revisión. Cuando esté aprobado, lo fusionamos.

### Convención de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/) en español:

```
feat: añadir filtro por tipo de SOS en el mapa
fix: ajustar foto pública por alto sin recortar
docs: aclarar orden de carga del esquema
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
Asunto en imperativo, ≤ 72 caracteres. El cuerpo (opcional) explica el *por qué*.

---

## Estilo de código

- **TypeScript strict.** Sin `any` salvo justificación.
- Sigue el estilo del código vecino (nombres, densidad de comentarios, patrones).
- Componentes y lógica nueva: piensa primero en accesibilidad (teclado, lectores
  de pantalla, contraste).
- No añadas dependencias pesadas sin discutirlo en un issue antes.

---

## Seguridad

¿Encontraste una vulnerabilidad? **No abras un issue público.** Sigue
[SECURITY.md](SECURITY.md).

---

## Código de conducta

Al participar, aceptas el [Código de Conducta](CODE_OF_CONDUCT.md). Trata a todo
el mundo con respeto: este proyecto nace del dolor de una emergencia.

---

Hecho con solidaridad. Datos abiertos · ayuda mutua.
