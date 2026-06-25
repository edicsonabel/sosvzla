<!--
Gracias por contribuir a SOS Venezuela. 🙏
Lee CONTRIBUTING.md y AGENTS.md antes de abrir el PR.
Mantén el PR enfocado en una sola cosa.
-->

## ¿Qué cambia?

<!-- Describe el cambio en 1-3 frases. -->

## ¿Por qué?

<!-- Issue relacionado (Closes #123), o el problema que resuelve. -->

## ¿Cómo probarlo?

<!-- Pasos para que el revisor verifique el cambio a mano. -->

## Capturas (si es UI)

<!-- Modo claro Y oscuro. Móvil si aplica. -->

---

## Checklist

- [ ] Leí [AGENTS.md](../AGENTS.md) y respeto las reglas que no se rompen.
- [ ] **No uso rojo** en la UI (ni la combinación verde+rojo+amarillo).
- [ ] **No expongo** el campo `contact` ni la `service_role` al público.
- [ ] **No commiteo secretos** (`.env.local`, secret keys).
- [ ] El insert anónimo sigue funcionando **sin login**.
- [ ] Código y BD en **inglés**; español solo en UI, comentarios y rutas.
- [ ] `bun run lint` pasa sin errores.
- [ ] `bun run build` compila sin errores.
- [ ] Probé a mano en **claro/oscuro** y, si aplica, en **móvil**.
- [ ] El PR está enfocado en un solo cambio.
