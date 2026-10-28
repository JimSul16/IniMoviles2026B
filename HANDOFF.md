# HANDOFF — pase de testigo entre los modelos

> Se actualiza al **cerrar cada fase**. Quien termina su turno rellena su bloque; quien arranca el
> siguiente lo lee antes de tocar un archivo. **Regla: un solo escritor a la vez.**
> Si el bloque anterior no tiene `BUILD: verde`, no se empieza la siguiente fase.

---

## Último estado

| Campo | Valor |
|---|---|
| **Proyecto** | **UrbanInspect** — inspección de infraestructura urbana (requisitos en `PLAN.md` §0, rúbrica 12,8 funcional + 3,2 defensa) |
| **Responsable ahora** | 🟦 MiMo (`mimo-infra`) — fase B |
| **Fase actual** | B — scaffold + estructura + rutas + deps + siembra |
| **BUILD** | — (aún no existe el proyecto Angular) |
| **Commits** | `61cf40e` · `1e09bba` · `fase-A: …` |
| **🚦 Señal** | `FASE-A: commiteado — esperando crear el recurso incidencias en MockAPI` |
| **Errores conocidos** | `GET …/incidencias` → **404**: el recurso **aún no está creado** en el panel de MockAPI (el proyecto sí existe y su CORS responde `ACAO: *`). El estudiante debe añadir el recurso `incidencias` con los 11 campos de `PLAN.md` §0 |

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

## Bloque #2 — 🟦 MiMo (fase A cerrada: PDF leído + plan + APIs verificadas)

```
Fase completada: A — leer el PDF → PLAN.md §0 → verificar APIs.
Hecho:
  · PDF extraído con pypdf (el modelo no lee PDF directamente): 10 requisitos (R1..R10) + rúbrica binaria
    12,8 funcional + 3,2 defensa. Orden de fases por dependencias y peso, no por número (ver PLAN.md §4).
  · PLAN.md §0 rellena: requisitos operativos, tabla de decisiones y §0.2 con las trampas de MockAPI.
  · §5 = checklist literal de la rúbrica (binaria).
  · APIs verificadas con el subagente verificador-api:
      – MockAPI  ✅ paginación remota (?page=&limit= + X-Total-Count), persistencia POST/PATCH real,
                 CORS, campo File para la foto. Descartadas con motivo: JSONPlaceholder, ReqRes,
                 DummyJSON, FakeStoreAPI, Platzi Fake API (todas: no persisten o no existen).
      – Open-Meteo ✅ 200 + ACAO:* + current.temperature_2m / current.precipitation (mm última hora)
                 / current.weather_code. Descartada wttr.in.
  · Proyecto MockAPI del estudiante creado: https://6ae2831abbb541292299fd5e.mockapi.io/
    (CORS verificado en vivo: ACAO *). URL base → src/environments (irá en fase B).
Siguiente: fase B (scaffold) y, del lado del estudiante, crear el recurso `incidencias` con los 11 campos.
Decisiones a respetar:
  · API de oficina: MockAPI, recurso `incidencias`, id autoincremental → código `INC-<id>`.
  · Fin real de datos por cabecera X-Total-Count: offset + recibidos >= total. PAGE_SIZE = 10.
  · Clima: Open-Meteo, sin clave; current.precipitation = mm de la última hora.
  · Foto: subir a MockAPI (File) y guardar la URL devuelta; comprimir antes de subir (cuota + tamaño).
  · Favoritos (R1) y borrador (R8): solo en @capacitor/preferences, nunca en la API.
BUILD: no aplica (fase de plan; aún no hay proyecto Angular).
Errores conocidos: recurso `incidencias` → 404 hasta que se cree en el panel de MockAPI.
```

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
