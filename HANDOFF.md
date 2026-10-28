# HANDOFF — pase de testigo entre los modelos

> Se actualiza al **cerrar cada fase**. Quien termina su turno rellena su bloque; quien arranca el
> siguiente lo lee antes de tocar un archivo. **Regla: un solo escritor a la vez.**
> Si el bloque anterior no tiene `BUILD: verde`, no se empieza la siguiente fase.

---

## Último estado

| Campo | Valor |
|---|---|
| **Proyecto** | **UrbanInspect** — inspección de infraestructura urbana (requisitos en `PLAN.md` §0, rúbrica 12,8 funcional + 3,2 defensa) |
| **Responsable ahora** | 🟪 **`gemini-ui`** — fase C (R2: listado de incidencias) |
| **Fase actual** | C — listado con los 8 campos, estados vacío y error |
| **BUILD** | ✅ **verde** — `npm run build` · `tsc` app+spec · `npm run lint` · `test:unit` 1/1 · `test:e2e` 2/2 |
| **Commits** | `61cf40e` · `1e09bba` · `259de6c` (fase A) · `fase-B: …` |
| **🚦 Señal** | `SCAFFOLD: listo — puede empezar gemini-ui` |
| **Errores conocidos** | · El recurso de MockAPI se llama **`API`** (no se pudo renombrar) → la URL vive en `environment.ts`; ver `PLAN.md` §0.1/§0.2 · **No existe `X-Total-Count`**: el fin real es `items.length === PAGE_SIZE` · límite de payload ≈100 KB (foto ≤ 70 KB base64) |

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

## Bloque #3 — 🟦 MiMo (fase B cerrada: scaffold + API viva + siembra)

```
Fase completada: B — scaffold + estructura + rutas + dependencias + siembra.
Hecho:
  · Proyecto Ionic 9 + Angular 22 (zoneless) + Capacitor 8 creado con `ionic start`
    en temporal y movido a la raíz. Identidad: appId ec.edu.epn.esfot.urbaninspect / appName UrbanInspect.
  · Estructura: src/app/{models,pages,components} · app.config.ts (provideHttpClient(withFetch())) ·
    app.routes.ts con las 5 páginas standalone y loadComponent (inicio, incidencias, seguimiento,
    incidencia/:id, registro) · environments con la URL de MockAPI, Open-Meteo y pageSize 10.
  · Modelo compartido `models/incidencia.model.ts` (contrato para 🟪): Incidencia, TIPOS/ESTADOS/
    PRIORIDADES con valor+etiqueta+icono, `codigoDe()` → INC-<id>, `SIGUIENTE_ESTADO` (R9),
    `prioridadExigeFoto()` (R5) y `esBache()` (R7).
  · Deps justificadas por requisito: @capacitor/preferences (R1/R8), @capacitor/camera (R6),
    @capacitor/geolocation (R7) + @capacitor/android. Plataforma android/ añadida (7 plugins detectados).
  · API viva verificada en vivo contra el proyecto del estudiante:
      POST 201 · PATCH 200 · DELETE 200 · CORS ACAO:* · paginación page=1..3 (10/10/6) y page=4 → [].
      SIN cabecera X-Total-Count → el fin real es `items.length === PAGE_SIZE` (§0.2.1).
      Límite de payload medido: 80 KB de base64 entra, 117 KB → 413. Foto ≤ 70 KB.
  · Siembra: `scripts/sembrar-incidencias.mjs` (sin dependencias, genera PNG de pocos KB con zlib)
    → 26 incidencias de sectores reales de Quito, los 3 estados, 3 prioridades, 5 tipos, 17 con foto.
  · Ajustes: .browserslistrc subido a Chrome/Firefox/Edge 120 + Safari 17 (Angular 22 ya no soportaba
    el rango del starter); e2e actualizado a la app real (2 specs) y chromium instalado.
Siguiente: 🟪 fase C (R2) — crear `src/app/services/` (todavía NO existe, es suyo) y el listado.
Decisiones a respetar:
  · Todo el HTTP vive en servicios de src/app/services/; ninguna página hace fetch.
  · El recurso de MockAPI se llama `API` (no se pudo renombrar); la URL SOLO cambia en environments.
  · Fin de paginación por tamaño de página, jamás por X-Total-Count ni repitiendo la petición.
  · Las fotos son base64 dentro del campo `foto` y se comprimen a ≤ 70 KB antes de enviarse.
BUILD: verde (build · tsc app+spec · lint --max-warnings 0 · vitest 1/1 · playwright 2/2).
Errores conocidos: ninguno. Cuota horaria de MockAPI: si aparece 429, esperar a la ventana siguiente.
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
