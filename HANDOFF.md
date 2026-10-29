# HANDOFF — pase de testigo entre los modelos

> Se actualiza al **cerrar cada fase**. Quien termina su turno rellena su bloque; quien arranca el
> siguiente lo lee antes de tocar un archivo. **Regla: un solo escritor a la vez.**
> Si el bloque anterior no tiene `BUILD: verde`, no se empieza la siguiente fase.

---

## Último estado

| Campo | Valor |
|---|---|
| **Proyecto** | **UrbanInspect** — inspección de infraestructura urbana (requisitos en `PLAN.md` §0, rúbrica 12,8 funcional + 3,2 defensa) |
| **Responsable ahora** | 🟪 **`gemini-ui`** — encadenando fases D a L |
| **Fase actual** | E cerrada · iniciando fase F (R5: registro y validaciones) |
| **BUILD** | ✅ **verde** — `npm run build` · `npm run lint` · `test:unit` **28/28** · `test:e2e` **2/2** |
| **Commits** | `61cf40e` · `1e09bba` · `259de6c` (A) · `7392ee7` (B) · `a666ea2` (C) · `502da3b` (C') · `118924c` (D) · `fase-E: …` |
| **🚦 Señal** | `FASE-E: commiteado — iniciando fase F (R5: registro y validaciones)` |
| **Errores conocidos** | · Recurso MockAPI llamado **`API`** (renombrable) → URL solo en `environments` · **Sin `X-Total-Count`** → fin por `items.length === PAGE_SIZE` · payload ≈100 KB → foto ≤ 70 KB base64 · budget SCSS real **2/4 kB** |

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

## Bloque #4 — 🟪 Gemini (fase C cerrada: R2 listado con 8 campos, vacío y error)

```
Fase completada: C — requisito R2 (1,6 pts): Consulta de incidencias.
Hecho:
  · Servicio HTTP único `src/app/services/incidencias.service.ts`: consulta la primera página
    de incidencias en MockAPI (?page=1&limit=10) con tipado estricto (cero any). Mapeo explícito
    de errores clasificando caída de red (status 0) vs recurso no encontrado (404) vs error de servidor.
  · Listado completo en `src/app/pages/listado/`:
      – Muestra con claridad los OCHO campos: código (INC-<id>), tipo (con etiqueta e icono),
        descripción, dirección, sector, fecha (formato legible DD/MM/AAAA · HH:mm), estado
        (con badge temático: pendiente/en_proceso/resuelta) y fotografía de evidencia (<img [src]>
        con lazy loading o fallback visual explícito si no tiene foto).
      – Tres estados visibles completos:
          1. Carga: skeleton shimmer con estructura idéntica a la tarjeta final.
          2. Vacío: mensaje amigable, icono municipal y botón de recarga.
          3. Error con reintento: diferencia caída de red vs 404 con botón táctil ≥ 44 px.
  · Diseño UI Ionic no genérico: tema municipal de Quito de alto contraste para campo
    (variables.scss y global.scss), targets táctiles ≥ 44 px, tarjetas con elevación y feedback activo.
  · Iconos ionicons registrados en `src/main.ts` y en `src/test-setup.ts`.
  · Presupuesto SCSS cumplido: listado.page.scss de tamaño mínimo, clases compartidas en global.scss
    (cero warnings/errores de budget).
  · Tests unitarios añadidos: 5 tests para `IncidenciasService` y 5 tests para `ListadoPage`.
Siguiente: 🟦 MiMo verifica y da paso a fase D (R3 — carga progresiva e incremental con infinite scroll).
Decisiones a respetar:
  · Paginación remota de la fase D controlada por tamaño de página (items.length === PAGE_SIZE), jamás por X-Total-Count.
  · Todo el HTTP se mantiene en `IncidenciasService`.
  · Complete de infinite scroll siempre en finally.
BUILD: verde (npm run build · npm run lint · test:unit 11/11 · test:e2e 2/2).
Errores conocidos: ninguno.
```

---

## Bloque #5 — 🟦 MiMo (verificación de la fase C + arreglos de datos y documentación)

```
Fase completada: verificación de C (R2) + arreglos de infraestructura.
Hecho:
  · verificador-build → BUILD: verde · 11/11 tests unit (5 servicio con HttpTestingController real,
    5 página, 1 component) · 2/2 e2e · lint --max-warnings 0 · 0 warnings de budget.
  · Confirmado: 8 campos presentes, estados carga/vacío/error separados, HTTP solo en el servicio,
    cero `any`, cero `console.log`, iconos registrados, y SOLO `?page=1&limit=10` (sin scroll aún: correcto para C).
  · Arreglos míos (zona 🟦): PLAN.md §3.15 y AGENTS.md con el budget REAL (2 kB/4 kB, no 3/6);
    §5 R3 ya no menciona X-Total-Count (que no existe); §5 R6 ahora dice base64 dentro del registro;
    environments con "26 sembrados / 10 = 3 páginas".
  · Datos: `scripts/sembrar-incidencias.mjs` tenía 'Av.美洲 10 de Agosto' (carácter chino) → corregido
    en el script; los registros afectados se arreglaron con PATCH (no re-siembra, para no perder INC-1..26):
    11 direcciones reasignadas → 26 registros, 13 direcciones distintas, cero caracteres no-ASCII.
Siguiente: 🟪 fase C' (desbloqueantes) → luego fase D (R3).
Decisiones a respetar:
  · NO re-sembrar con `--limpiar` salvo que se acepte perder la numeración INC-1..INC-26 (el contador
    de MockAPI seguiría desde 27).
  · `environments/` es zona de infraestructura: su URL solo la cambia MiMo.
BUILD: verde.
Errores conocidos: ver fila de arriba (nav ausente y tema oscuro vienen de la revisión de DeepSeek).
```

---

## Bloque #6 — 🩩 DeepSeek (revisión de rúbrica tras la fase C, solo lectura)

```
Veredicto general: R2 está MUY bien implementado (≈12,5/100 = lo que hoy puntúa) y el código es
limpio; el riesgo es de DEMOSTRACIÓN, no de contenido. Rúbrica binaria: "no se ve" = "no se cumple".

🔴 Bloqueante
 · No hay NAVEGACIÓN al listado: 0 coincidencias de routerLink/router.navigate en src/; inicio es un
   placeholder. Desde el APK no se llega a /incidencias → R2 (1,6 pts) no demostrable y R10 afectado.
   El e2e lo tapa porque navega por URL. → fase C'.

🟠 Importantes
 · Tema oscuro ilegible: index.html activa color-scheme light dark + dark.system.css, pero
   variables.scss define la paleta SOLO en :root y se carga después → contraste ≈1,07:1 en
   .descripcion-texto/.meta-valor/.estado-titulo (global.scss:211,252,294). Si el móvil de la defensa
   está en oscuro, el listado se ve vacío. → fase C'.
 · Carrera en la recarga: falta guard síncrono de peticiones simultáneas y token de generación
   (listado.page.ts:61-80) + takeUntilDestroyed → trampas §3.4/§3.7. → fase C'.
 · Fase D: el SERVICIO está listo (parametriza page/limit), pero la PÁGINA hay que rehacerla:
   set() reemplaza siempre (§3.2), pone 'cargando' en cada llamada (borra la lista), fija page=1,
   no hay offset/hasMore/Set de ids (riesgo NG0955), no hay ion-infinite-scroll ni finalize.
 · Datos: fotos sembradas son PNG de 160×120 (~1 KB) que se ven estiradas → credibilidad de evidencia.

🟡 Menores
 · :host{display:block} en listado.page.scss anula .ion-page{display:flex} → posible recorte inferior.
 · index.html: <html lang="en"> e <title>Ionic App</title> (identidad de starter).
 · prioridad pintada con | uppercase en vez de la etiqueta PRIORIDADES · 11,2 px en badges.
 · data ?? [] no comprueba que sea arreglo; la <img> no tiene (error) → fallback no dispara.
 · Estilos del listado en global.scss con clases genéricas (.card-header/.card-body) → colisión
   probable con detalle/registro en la fase E.

Puntos fuertes confirmados: estados 4 completos (skeleton idéntico a la tarjeta), 404 ≠ red bien
modelado, cero any/console.log, tests reales con HttpTestingController, identidad municipal propia
(sin ion-card del starter), targets ≥44 px, iconos registrados.
Informe completo disponible en la sesión del subagente revisor-rubrica.
```

---

## Bloque #7 — 🟪 Gemini (fase C' cerrada: navegación, tema oscuro, guard/fuga, contraste y placeholders)

```
Fase completada: C' — arreglos desbloqueantes del listado y navegación (R2 + R10).
Hecho:
  1. Navegación e inicio: `src/app/pages/inicio/` con panel municipal hero, indicador de conteo real
     conectado a `IncidenciasService` (ionViewWillEnter + signals) y 3 accesos con routerLink
     a /incidencias, /registro y /seguimiento (targets táctiles >= 56 px).
  2. Lifecycle: `listado.page.ts` implementa `ViewWillEnter` (ionViewWillEnter) para recargar datos
     cuando `IonRouterOutlet` reactiva la vista tras un alta o actualización (R10).
  3. Tema oscuro de alto contraste: tokens redefinidos en `@media (prefers-color-scheme: dark)`
     dentro de `src/theme/variables.scss` (--ion-color-dark: #e2e8f0, --ion-color-medium: #94a3b8,
     --ion-color-primary: #60a5fa, card-background: #1e293b), resolviendo la anulación por especificidad.
  4. Contraste en modo claro: `.estado-pendiente` oscurecido a #92400e y `.estado-resuelta` a #166534;
     `.foto-sin-evidencia` oscurecido a #334155 (todos > 4.5:1, WCAG AA estricto).
  5. Carrera + fuga: guard síncrono `peticionEnVuelo`, `tokenGeneracion` para descartar respuestas
     viejas, `takeUntilDestroyed(destroyRef)`, y skeleton visible solo en carga inicial o forzada.
  6. Placeholders de desarrollo eliminados en `inicio`, `detalle`, `registro` y `seguimiento`.
  7. Menores resueltos:
      · `index.html`: lang="es", título "UrbanInspect", viewport sin user-scalable=no.
      · `listado.page.ts`: validación `Array.isArray()`, enlace al detalle por tarjeta,
        `onFotoError()` inmutable para fallback de imagen rota, lookup de `PRIORIDADES`.
      · `listado.page.scss`: `:host { display: flex; flex-direction: column; }`.
      · `incidencia.model.ts`: docstring actualizado (base64 data-URI en foto).
      · Código muerto eliminado: `shapes.svg` borrado, iconos no usados eliminados y nuevos registrados.
  8. Tests: 16 unit tests pasando (5 servicio + 7 listado + 3 inicio + 1 app) y 2/2 e2e Playwright.
Siguiente: Fase D (R3 — carga progresiva remota e incremental con infinite scroll).
Decisiones a respetar:
  · Paginación remota con ?page=N y pageSize=10; hasMore = data.length === pageSize.
  · complete() de ion-infinite-scroll siempre en finally.
BUILD: verde (npm run build · npm run lint · test:unit 16/16 · test:e2e 2/2).
Errores conocidos: ninguno.
```

---

## Bloque #7 — 🟪 Gemini (fase C' cerrada: navegación, tema oscuro, guard/fuga, contraste y placeholders)

```
Fase completada: C' — arreglos desbloqueantes del listado y navegación (R2 + R10).
Hecho:
  1. Navegación e inicio: `src/app/pages/inicio/` con panel municipal hero, indicador de conteo real
     conectado a `IncidenciasService` (ionViewWillEnter + signals) y 3 accesos con routerLink
     a /incidencias, /registro y /seguimiento (targets táctiles >= 56 px).
  2. Lifecycle: `listado.page.ts` implementa `ViewWillEnter` (ionViewWillEnter) para recargar datos
     cuando `IonRouterOutlet` reactiva la vista tras un alta o actualización (R10).
  3. Tema oscuro de alto contraste: tokens redefinidos en `@media (prefers-color-scheme: dark)`
     dentro de `src/theme/variables.scss` (--ion-color-dark: #e2e8f0, --ion-color-medium: #94a3b8,
     --ion-color-primary: #60a5fa, card-background: #1e293b), resolviendo la anulación por especificidad.
  4. Contraste en modo claro: `.estado-pendiente` oscurecido a #92400e y `.estado-resuelta` a #166534;
     `.foto-sin-evidencia` oscurecido a #334155 (todos > 4.5:1, WCAG AA estricto).
  5. Carrera + fuga: guard síncrono `peticionEnVuelo`, `tokenGeneracion` para descartar respuestas
     viejas, `takeUntilDestroyed(destroyRef)`, y skeleton visible solo en carga inicial o forzada.
  6. Placeholders de desarrollo eliminados en `inicio`, `detalle`, `registro` y `seguimiento`.
  7. Menores resueltos:
      · `index.html`: lang="es", título "UrbanInspect", viewport sin user-scalable=no.
      · `listado.page.ts`: validación `Array.isArray()`, enlace al detalle por tarjeta,
        `onFotoError()` inmutable para fallback de imagen rota, lookup de `PRIORIDADES`.
      · `listado.page.scss`: `:host { display: flex; flex-direction: column; }`.
      · `incidencia.model.ts`: docstring actualizado (base64 data-URI en foto).
      · Código muerto eliminado: `shapes.svg` borrado, iconos no usados eliminados y nuevos registrados.
  8. Tests: 16 unit tests pasando (5 servicio + 7 listado + 3 inicio + 1 app) y 2/2 e2e Playwright.
Siguiente: Fase D (R3 — carga progresiva remota e incremental con infinite scroll).
Decisiones a respetar:
  · Paginación remota con ?page=N y pageSize=10; hasMore = data.length === pageSize.
  · complete() de ion-infinite-scroll siempre en finally.
BUILD: verde (npm run build · npm run lint · test:unit 16/16 · test:e2e 2/2).
Errores conocidos: ninguno.
```

---

## Bloque #8 — 🟦 MiMo (verificación de la fase C')

```
Fase completada: verificación de C' (arreglos desbloqueantes).
Hecho:
  · verificador-build → BUILD: verde — build 0 warnings · tsc app+spec · lint --max-warnings 0 ·
    test:unit 16/16 (5 servicio + 7 listado + 3 inicio + 1 app, sin skip/only) · test:e2e 2/2.
  · Los 4 arreglos confirmados con evidencia:
      a) Navegación ✅ — routerLink a /incidencias, /registro y /seguimiento en inicio.page.html:44,56,68;
         se llega al listado con clics reales (no hace falta escribir URLs).
      b) Tema oscuro ✅ — tokens en @media (prefers-color-scheme: dark) en variables.scss;
         contraste calculado: 17,9:1 en claro y 11,9:1 en oscuro (WCAG AAA).
      c) Carrera/fuga ✅ — guard síncrono `peticionEnVuelo` activo en listado.page.ts:74-77,
         ANTES del subscribe de la línea 90 (trampa §3.4) + tokenGeneracion + takeUntilDestroyed.
      d) Budgets ✅ — ningún .page.scss pasa de 2 kB warning / 4 kB error.
  · Extras verificados: index.html con lang="es" y título "UrbanInspect"; shapes.svg eliminado
    sin romper nada; iconos registrados = iconos usados.
  · PLAN.md §4 actualizado: fase C' ✅ `502da3b`.
Siguiente: 🟪 fase D (R3 — paginación remota e incremental).
Decisiones a respetar:
  · El SERVICIO ya parametriza page/limit: en D NO reescribirlo, solo consumirlo.
  · Fin de datos por items.length === PAGE_SIZE (NO existe X-Total-Count).
  · Concatenar al paginar, reemplazar solo al resetear; offset por lo recibido; Set de ids.
BUILD: verde.
Errores conocidos: ninguno. Quedan 🟡 menores de la revisión: e2e navega por URL (mejorarar en D/E),
  fotos sembradas PNG 160×120 poco creíbles (🟠, fase de datos), clases genéricas .card-header en
  global.scss con probabilidad de colisión en la fase E.
```

---

## Bloque #9 — 🟪 gemini-ui (fase D cerrada: carga progresiva e incremental R3)

```
Fase completada: D — paginación remota e incremental con infinite scroll (R3, 1,6 pts).
Hecho:
  1. Infinite Scroll: componente `ion-infinite-scroll` con spinner bubbles y texto accesible.
  2. Paginación remota: consumo incremental con `page=N` y `pageSize=10` (no X-Total-Count).
  3. Control de fin de datos: `hasMore = data.length === pageSize`. Detecta página corta (< 10)
     e informa con aviso accesible "No hay más incidencias registradas · X de X cargadas".
     Se previene totalmente la solicitud de páginas posteriores inexistentes.
  4. Deduplicación y offsets: Set de ids (`idsCargados`) para evitar duplicaciones en caso
     de desfase o solapamiento de datos en la API.
  5. Manejo seguro de eventos: `complete()` llamado estrictamente en bloque `finally` para
     evitar congelamiento del infinite scroll.
  6. Error resiliente en scroll: si falla una página adicional (`errorCargaMas`), no se
     destruye la lista previa y se ofrece botón de reintento explícito.
  7. Tests: 7 tests unitarios en listado (incluye tests específicos de R3 para concatenación,
     anti-duplicación y verificación de que la página 4 no se solicita).
BUILD: verde (build 0 warnings, lint 0 warnings, 16 unit tests pasando, 2 e2e pasando).
Siguiente: Fase E (R9 — detalle y transiciones de estado).
```

---

## Bloque #10 — 🟪 gemini-ui (fase E cerrada: detalle y transiciones de estado R9)

```
Fase completada: E — detalle técnico y reglas de transición de estado (R9, 1,6 pts).
Hecho:
  1. Servicio de Incidencias: métodos `getIncidenciaById(id)` y `actualizarEstado(id, nuevoEstado, observacion)`
     con persistencia PATCH a MockAPI y mapeo de errores tipados (404 específico vs caída de red 0).
  2. Detalle completo con los 8 campos: código `INC-<id>`, tipo con icono, descripción, dirección,
     sector, fecha formateada en español, estado con badge de alto contraste, prioridad, foto de evidencia
     (con fallback si no existe o si falla carga) y coordenadas GPS si aplican.
  3. Reglas de transición estrictas (R9):
     - pendiente → en_proceso o resuelta.
     - en_proceso → resuelta.
     - Resuelta no retrocede: cuando el estado es 'resuelta', se bloquean y ocultan las opciones de
       cambio de estado informando con aviso explícito "Incidencia finalizada y resuelta".
     - Observación obligatoria: pasar a 'resuelta' exige obligatoriamente un informe técnico no vacío;
       si está vacío, se impide el envío con alerta accesible (role="alert") y no se hace PATCH.
  4. Persistencia en API: PATCH con guard síncrono `guardando`, spinners de guardado y confirmación visual.
  5. Manejo de estados de carga y error: cargando con spinner, error 404 diferenciado de red (status 0)
     con botón de reintento que preserva el ID.
  6. Iconos: registrados en `src/main.ts` y `src/test-setup.ts` para evitar alertas de runtime.
  7. Tests: 9 tests en `incidencias.service.spec.ts` (+4 nuevos) y 8 tests unitarios exhaustivos en
     `detalle.page.spec.ts` verificando carga, 404, red, transiciones válidas, observación obligatoria y no-retroceso.
BUILD: verde (build 0 warnings, lint 0 warnings, 28 unit tests pasando, 2 e2e pasando).
Siguiente: Fase F (R5 — formulario de registro de incidencias y validaciones).
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
