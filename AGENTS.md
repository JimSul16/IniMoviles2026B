# AGENTS.md — reglas del workspace (Antigravity + OpenCode)

> **Dos programas, una carpeta.** Antigravity y OpenCode trabajan **a la vez** sobre este mismo árbol.
> Este archivo lo carga Antigravity solo (workspace rules) y OpenCode vía `instructions` en `opencode.jsonc`.
> Fuente de verdad del proyecto: `PLAN.md` (qué hacer) y `HANDOFF.md` (quién hace qué ahora mismo).

## Protocolo de dos ventanas (obligatorio)

1. **Un solo escritor a la vez, incluso entre programas.** La fila **🚦 Señal** de `HANDOFF.md` dice
   quién tiene el turno **ahora**. Si no es tu turno: **no edites ningún archivo** — revisa, planifica,
   verifica o espera a la señal. Antes de empezar a escribir, vuelve a leer esa fila.
2. **Zonas exclusivas** (sean del programa que sean):
   - 🟪 `gemini-ui` → **`src/**`** (código e interfaz)
   - 🟦 `mimo-infra` → raíz: `package.json`, `angular.json`, `ionic.config.json`,
     `capacitor.config.ts`, `README.md`, `PLAN.md`, `HANDOFF.md`, `.git/`
   - 🟩 `deepseek-revisor` → **solo lectura**, nunca escribe
3. **Git es de una sola mano por vez.** Solo el turno activo ejecuta `git add` / `commit` / `push`.
   Si `git status` muestra `.git/index.lock`, commits sin confirmar que no son tuyos o un remote
   desincronizado → **espera a que el otro termine**, no fuerces nada (`git push --force` prohibido).
4. **Un solo build/instalación a la vez.** `npm install` y `npm run build` escriben en `node_modules/`
   y `dist/`: si el otro programa está compilando, espera a que termine antes de lanzar el tuyo.
5. **Antes de tocar nada:** `git status` limpio + último bloque de `HANDOFF.md` leído.
6. **Al cerrar tu turno:** build verde → tabla §4 de `PLAN.md` → bloque en `HANDOFF.md` (incluye la
   fila 🚦 con el siguiente responsable) → **commit atómico** con `git add <rutas>` (nunca `git add -A`).

## Skills disponibles (las mismas en ambas herramientas)

- `.agents/skills/` (Antigravity workspace + OpenCode): `deteccion-codigo-muerto`,
  `pruebas-backend-esfot`, `pruebas-frontend-esfot`, `refactor-seguro`
- `.opencode/skills/` (OpenCode): `ionic-app-setup`, `ui-ionic-design`
- **Obligatorias:** `ui-ionic-design` **antes de escribir cualquier pantalla** (antídoto del diseño
  genérico) · `ionic-app-setup` para crear la app y compilar el APK por terminal ·
  `pruebas-frontend-esfot` para dar una fase por cerrada.

## Errores ya sufridos (léelos en `PLAN.md` §3 antes de programar)

`complete()` en `finally` · dedupe por id con `Set` · offset por lo recibido · token de generación en
la búsqueda · vacío ≠ error · 404 ≠ caída de red · favoritos = solo ids · `addIcons()` en `main.ts` ·
budget de SCSS 3 kB/6 kB.
