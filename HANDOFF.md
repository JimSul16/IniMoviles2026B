# HANDOFF — pase de testigo entre los modelos

> Se actualiza al **cerrar cada fase**. Quien termina su turno rellena su bloque; quien arranca el
> siguiente lo lee antes de tocar un archivo. **Regla: un solo escritor a la vez.**
> Si el bloque anterior no tiene `BUILD: verde`, no se empieza la siguiente fase.

---

## Último estado

| Campo | Valor |
|---|---|
| **Proyecto** | Prueba de Aplicaciones Móviles (requisitos en `PLAN.md` §0) |
| **Responsable ahora** | 🟦 MiMo (`mimo-infra`) — fase A |
| **Fase actual** | A — leer el PDF + plan + verificar endpoints |
| **BUILD** | — (aún no hay proyecto) |
| **Commits** | — |
| **🚦 Señal** | `SCAFFOLD: pendiente` |
| **Errores conocidos** | — |

---

## Cómo se usa

1. **Al arrancar tu turno:** lee `PLAN.md` (§0 requisitos, §2 reglas, §3 trampas) y el último bloque de aquí.
2. **Al cerrar tu turno:** actualiza la tabla de arriba + escribe tu bloque abajo + commit atómico.
3. **Zonas**: 🟪 Gemini = `src/**` · 🟦 MiMo = raíz/configs/git · 🟩 DeepSeek = solo lectura.
4. Señales que se escriben en la fila **🚦 Señal**:
   - `SCAFFOLD: listo` → 🟪 Gemini ya puede empezar a programar.
   - `FASE-X: commiteado (<hash>)` → siguiente fase / siguiente modelo.
   - `BUILD: rojo (<error>)` → se avisa sin arreglar la zona ajena.

---

## Bloque #1 — 🟦 MiMo (plantilla creada, sin proyecto todavía)

**Hecho:** carpeta de la prueba creada con `PLAN.md`, `HANDOFF.md`, `opencode.jsonc`,
7 agentes y las skills `ionic-app-setup` + `ui-ionic-design` restauradas desde el backup de API Explorer.

**Siguiente:** fase A — pegar el PDF, completar `PLAN.md` §0 y verificar la API.

**Decisiones a respetar:** API elegida solo si responde con HTTP 200 + CORS desde la red local ·
`PAGE_SIZE` acordado en el plan · todo el HTTP vive en un único servicio · favoritos = solo ids.

---

## Bloque #N — de <modelo> a <modelo>

```
Fase completada: ...
Hecho: ...
Siguiente: ...
Decisiones a respetar: ...
BUILD: verde/rojo (+ comando exacto)
Errores conocidos: ...
```
