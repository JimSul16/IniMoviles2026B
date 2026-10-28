# PLAN DE TRABAJO — Prueba de Aplicaciones Móviles

> Modelo de plan heredado de **API Explorer** (22/10 → 28/10, 100/100 de requisitos, APK 4,44 MB).
> Rellena la §0 con el **PDF de la prueba** antes de empezar cualquier fase.
> Equipo: 🟪 **Gemini 3.8 Flash** (Antigravity) · 🟦 **MiMo** · 🟩 **DeepSeek**

---

## 0. Requisitos de la prueba ← **PDF: Prueba I "UrbanInspect"**

> **Enunciado (sección 3 y 4 del PDF):** app móvil para que los inspectores del Municipio de Quito consulten,
> registren y actualicen **incidencias de infraestructura urbana** (luminarias dañadas, baches, señalización
> deteriorada, alcantarillas obstruidas, daños en parques) desde Android, con **evidencia fotográfica** y
> **ubicación**. El sistema de oficina se simula con una **API REST** y el clima se consulta en una
> **API externa real**. La defensa es un **APK instalado** + demostración + explicar el código **sin IA**.
> **Rúbrica binaria** (sin puntos parciales): 12,8 funcional + 3,2 defensa = 16 pts (Prueba I).
> Regla: un requisito = una fila = una fase = un commit. Ordenado por **dependencias y peso**, no por número.

| Req. | Qué pide el PDF (resumen operativo) | Pts | Fase | Responsable |
|---|---|---|---|---|
| **R2** | **Consulta de incidencias**: listado con los **8 campos** (código, tipo, descripción, dirección, sector, fecha, estado y fotografía si existe) + manejar **registros vacíos** y **fallo de consulta** | 1,6 | C | 🟪 Gemini |
| **R3** | **Carga progresiva**: paginación **remota** en grupos pequeños según se avanza; **prohibido** descargar todo y partirlo en el teléfono; al agotarse los registros **no debe seguir pidiendo páginas** | 1,6 | D | 🟪 Gemini |
| **R9** | **Detalle y reglas de estado**: pendiente → en proceso → resuelta; en proceso → resuelta; una **resuelta no retrocede**; para resolver es **obligatoria una observación**; el cambio queda en la API | 1,6 | E | 🟪 Gemini |
| **R5** | **Registro de incidencias**: tipo, descripción, dirección, sector y prioridad (baja/media/alta); **validar obligatorios antes de enviar**; prioridad **alta exige fotografía** (en baja/media es opcional); el registro debe quedar en la API | 1,6 | F | 🟪 Gemini |
| **R6** | **Evidencia fotográfica**: capturar y **revisar antes de guardar**; si cancela la captura **los demás datos quedan intactos**; si la foto es obligatoria y el permiso se deniega → explicarlo e **impedir guardar incompleto**; la foto debe quedar **accesible desde el detalle** (no basta una ruta temporal del dispositivo) | 1,6 | G | 🟪 Gemini |
| **R7** | **Ubicación**: obtener coordenadas actuales (también alimentan al clima); en **bache es obligatoria**: sin GPS hay que permitir **coordenadas manuales válidas**; en el resto es opcional y siempre puede registrarse la dirección | 1,2 | H | 🟪 Gemini |
| **R8** | **Recuperar registro incompleto**: si abandona el formulario o la app se cierra durante la captura, al reabrirla debe ofrecer **continuar o descartar**, conservando lo ya ingresado (salvo lo no recuperable justificadamente) | 1,2 | I | 🟪 Gemini |
| **R4** | **Consulta de clima antes de guardar**: API meteorológica **externa y real**, distinta de la de incidencias, usando **las coordenadas del lugar**; muestra **temperatura actual, precipitación acumulada de la última hora (mm)** y **descripción del estado**; si supera **5 mm/h** advierte que puede dificultar el mantenimiento **sin bloquear**; si falla o no hay datos → informar y **permitir continuar**. Nada de datos fijos o simulados | 0,8 | J | 🟪 Gemini |
| **R1** | **Seguimiento local**: marcar/desmarcar incidencias como "para seguimiento"; la lista de códigos **persiste al cerrar y abrir la app**; vista propia que muestra **solo** las marcadas; al desmarcar desaparece de esa vista **sin modificar el servicio de oficina** | 0,8 | K | 🟪 Gemini |
| **R10** | **Navegación y APK**: **inicio con indicadores**, listado, sección de seguimiento, detalle y formulario de registro con navegación clara e interfaz pensada para **trabajo en campo**; los listados e indicadores deben **reflejar altas y actualizaciones**; demostrado con **APK instalado** en Android o emulador | 0,8 | L | 🟪 Gemini |

**Subtotal funcional: 12,8 pts** · Defensa oral: 3,2 pts (demostración, justificación de decisiones y explicar el código, sin IA).

### 0.1 Decisiones técnicas (verificadas el 28/10/2026 con el subagente `verificador-api`)

| Decisión | Elección | Motivo (con evidencia) |
|---|---|---|
| **API de oficina (recurso `incidencias`)** | **MockAPI** → `https://<proyecto>.mockapi.io/api/v1/incidencias` (cuenta gratuita del estudiante: 1 proyecto / 2 recursos, sin tarjeta) | Única opción **sin backend propio** que cumple a la vez las **tres** exigencias del PDF: **paginación remota real** (`?page=&limit=` + cabecera `X-Total-Count`), **persistencia real** de POST/PATCH (lo que registra el inspector se lee después) y **CORS** desde `http://localhost:4200`. Además su campo **File** guarda la foto y devuelve una **URL pública permanente**, cumplendo "no basta una ruta temporal del dispositivo". La URL base vive en `src/environments/` (no es secreto; la cuota sí se respeta) |
| **API de clima** | **Open-Meteo** → `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,precipitation,weather_code&timezone=auto` | Verificado con HTTP 200 + `Access-Control-Allow-Origin: *` + sin clave. Devuelve `current.temperature_2m`, `current.precipitation` (**mm de la hora en curso**, exactamente la "precipitación de la última hora" de R4) y `current.weather_code` (código WMO que traducimos a texto en español) |
| **Código de la incidencia** | `INC-<id autoincremental>` (el `id` de MockAPI) | Identificador único, sin duplicados y sirve de clave para seguimiento y detalle |
| **Descartada: JSONPlaceholder** | `?_page=&_limit=` + `X-Total-Count` | Pagina bien, CORS ok, pero el **POST no persiste** (201 falso) → R5/R9 imposibles |
| **Descartada: ReqRes** | `?page=&per_page=` + `total/total_pages` | Paginación perfecta pero POST/PATCH son **simulados**: hacer GET del id creado devuelve **404** |
| **Descartada: DummyJSON** | `?skip=&limit=` + `total` | Pagina bien y tiene CORS, pero **no persiste** y sus campos son fijos (productos) |
| **Descartada: FakeStoreAPI** | `?limit` | No pagina de verdad (devuelve el array completo) y no persiste |
| **Descartada: Platzi Fake API** | — | El dominio `fakeapi.platzi.com` **no resuelve** (ENOTFOUND) |
| **Descartada: wttr.in (clima)** | `?format=j1` | Responde con CORS pero sin estructura determinista ni coordenadas de salida; Open-Meteo es la opción limpia |
| **Stack** | Ionic + Angular standalone + Capacitor + TypeScript | el mismo que en API Explorer: ya está verificado y conocemos sus trampas |
| **Persistencia local** | `@capacitor/preferences` | **solo** para el seguimiento (R1) y el borrador del formulario (R8); nunca se sube a la API |
| **Dependencias adicionales** | ninguna salvo las imprescindibles (Capacitor Camera / Geolocation / Preferences) | el PDF exige justificar cada una por requisito |
| **Tiempo** | El estudiante confirmó que su defensa **no** es la del 28/10 a las 14:00 | Se trabaja con calidad completa: un requisito por fase, sin saltarnos validaciones |

### 0.2 Reglas de la API que NO se rompen (trampas de MockAPI)

1. **Fin real de datos**: `offset + recibidos >= Number(X-Total-Count)`. **Nunca** se simula el fin repitiendo la petición: MockAPI responde 200 con `[]` y eso también pasa en la mitad de los datos.
2. `X-Total-Count` va en la **cabecera**, no en el body → leer `response.headers.get('X-Total-Count')`.
3. El nombre del recurso se añade **al final de la URL**: un recurso mal escrito devuelve **404**, y 404 en el listado **no** es caída de red (§3.10).
4. Plan gratis con **cuota por hora**: `PAGE_SIZE = 10` y **debounce ≥ 400 ms**; la siembra de datos también consume cuota (se hace una sola vez desde infraestructura).
5. La foto se sube en **multipart** al campo `File` y la API devuelve una **URL** que hay que guardar en el campo `foto` del registro.
6. El registro de MockAPI **no admite campos desconocidos**: si el esquema no tiene `observacion`, el campo se pierde en silencio → el recurso se crea **con todos los campos del modelo** desde el principio.

---

## 1. Equipo, zonas, skills y modelo de cada rol

| Agente | Modelo | Zona exclusiva | Skills que USA | Rol |
|---|---|---|---|---|
| 🟪 **`gemini-ui`** | `google/gemini-3.8-flash` | **`src/**`** | **`ui-ionic-design`** (obligatoria) · `pruebas-frontend-esfot` · `deteccion-codigo-muerto` | Programa los requisitos: modelos, servicio HTTP, páginas, componentes, estados e **interfaz no genérica** |
| 🟦 **`mimo-infra`** | `opencode/mimo-v2.6-flash-free` | raíz: `package.json`, `angular.json`, `ionic.config.json`, `capacitor.config.ts`, `README.md`, `.git/`, `PLAN.md`, `HANDOFF.md` | **`ionic-app-setup`** (obligatoria) · `pruebas-frontend-esfot` · `pruebas-backend-esfot` *(si hay backend/proxy)* | Escribe este plan, scaffold, dependencias, build, git, **APK por terminal**, README y evidencias |
| 🟩 **`deepseek-revisor`** | `opencode/deepseek-v4.1-flash-free` | **solo lectura** | **`refactor-seguro`** · **`deteccion-codigo-muerto`** · `pruebas-frontend-esfot` | Revisa contra el PDF y la rúbrica; caza bugs y diseños genéricos; propone fixes (no los aplica) |

### 1.1 Las 6 skills del proyecto y quién la carga

| Skill | Origen | Se carga cuando… | La usan |
|---|---|---|---|
| **`ionic-app-setup`** | creada en API Explorer | crear la app, rutas, deps y **compilar el APK por terminal** | 🟦 `mimo-infra` |
| **`ui-ionic-design`** | creada en API Explorer | **antes de escribir cualquier pantalla** | 🟪 `gemini-ui` |
| **`pruebas-frontend-esfot`** | `SKILLS_INSTALADAS` (Antigravity) | criterios de "verde": build, typecheck, lint, contrato de tipos | 🟪 y 🟦 (cierra de fase) |
| **`pruebas-backend-esfot`** | `SKILLS_INSTALADAS` (Antigravity) | solo si el PDF exige backend/proxy | 🟦 `mimo-infra` |
| **`refactor-seguro`** | `SKILLS_INSTALADAS` (Antigravity) | **antes de cualquier borrado** (jerarquía de evidencia → riesgo A/B/C/D) | 🟩 `deepseek-revisor` · 🟦 en limpiezas |
| **`deteccion-codigo-muerto`** | `SKILLS_INSTALADAS` (Antigravity) | auditoría de código no usado con evidencia de grep | 🟩 `deepseek-revisor` · 🟪 al cerrar fases |

> **Dónde viven (mismo contenido para las dos herramientas):**
> - En el repo: `.agents/skills/<nombre>/SKILL.md` → las lee **Antigravity** (workspace) y **OpenCode** (vía `skills` en `opencode.jsonc`).
> - En el repo: `.opencode/skills/` → las 2 creadas por nosotros (OpenCode).
> - Global en tu máquina: `~/.gemini/config/skills/` → **Antigravity** en cualquier proyecto.

**Subagentes** (solo lectura, se lanzan desde cualquiera; están en `.opencode/agents/`):

| Subagente | Modelo | Skills | Qué hace |
|---|---|---|---|
| `verificador-api` | 🟦 MiMo | — | HTTP 200, CORS, paginación y campos de la API candidata |
| `verificador-build` | 🟦 MiMo | `pruebas-frontend-esfot` | `build` + `tsc` app/spec + `lint` + `test` → `BUILD: verde\|rojo` |
| `revisor-rubrica` | 🟩 DeepSeek | `pruebas-frontend-esfot` | puntuación /100 por requisito + hallazgos `archivo:línea` |
| `auditor-muerto` | 🟩 DeepSeek | `deteccion-codigo-muerto`, `refactor-seguro` | código sin uso con evidencia, clasificado por riesgo |

---

## 2. Reglas de coordinación (las que funcionaron, no negociables)

1. **Un solo escritor a la vez.** 🟪 y 🟦 nunca editan a la vez. 🟩 no escribe jamás.
2. **Zonas exclusivas.** Si necesitas algo de la zona ajena, se anota en `HANDOFF.md`, no se toca.
3. **Build verde antes de pasar el testigo.** `npm run build` + `tsc` (app y spec) + `npm run lint` + `npm test` en verde.
4. **Commit atómico por fase**, con el mensaje `fase-X: descripción`. **Nunca `git add -A`**: `git add <rutas>`.
5. **`HANDOFF.md` se actualiza al cerrar cada fase** (qué quedó, decisiones, errores, siguiente paso).
6. **APK siempre por terminal**, nunca desde Android Studio.

### 2.1 Secuencia de turnos

```
[🟦 MiMo]   Fase A: leer el PDF → PLAN.md → probar endpoints (verificador-api)
            Fase B: scaffold + estructura + rutas + deps        → build verde → commit
[🟪 Gemini] Fase C…: UN requisito por fase (código + UI)        → build verde → commit → HANDOFF
[🟩 DeepSeek] tras cada fase: revisión rúbrica + código (solo lectura, hallazgos accionables)
[🟦 MiMo]   Cierre: APK por terminal · README · capturas/video · push
```

### 2.2 Protocolo de cierre de turno (obligatorio)

1. Lanza `verificador-build`; si está rojo, no se pasa el testigo.
2. Actualiza la tabla *Progreso por fase* (§4).
3. Escribe tu bloque en `HANDOFF.md`.
4. Commit atómico por fase.

### 2.3 Dos programas, una carpeta (Antigravity + OpenCode a la vez)

Ambos se abren sobre **el mismo árbol**, así que además de las reglas anteriores:

1. **El turno lo marca una sola cosa: la fila 🚦 de `HANDOFF.md`.** Es el "candado" del equipo:
   quien va a escribir **primero la actualiza con su nombre**; quien la lea y no sea su turno, espera.
2. **Git solo lo toca el turno activo**: si ves `.git/index.lock`, commits ajenos sin pushear o el
   remote desfasado, no fuerces — espera a que el otro cierre su commit (`--force` prohibido).
3. **Un solo `npm install`/`npm run build` a la vez**: los dos escriben en `node_modules/` y `dist/`.
4. **Nunca los dos editores a la vez en la misma fase.** Si Gemini está programando en Antigravity,
   OpenCode puede *revisar* (DeepSeek, solo lectura) pero no escribe, y viceversa.
5. **Un solo push por fase**, después del commit del turno activo.

> `AGENTS.md` en la raíz duplica estas reglas para **Antigravity** (lo carga solo como workspace rules);
> `opencode.jsonc` las carga en OpenCode vía `instructions`. Si cambias una regla, cámbialas en ambos.

---

## 3. Trampas ya sufridas en API Explorer (léelas antes de programar)

Esto es lo que nos costó trabajo la vez pasada. Casi todo el PDF de la actividad pide exactamente esto:

1. **`complete()` del infinite scroll SIEMPRE en `finally`** — si falla una página y no lo llamas, el scroll queda congelado.
2. **Concatenar al paginar, reemplazar solo al resetear** — el error más común.
3. **Anti-duplicados con `Set<string>` de ids**, también **dentro** de una misma página (si no, Angular salta NG0955).
4. **Guard anti-peticiones simultáneas** activado **síncrono** antes del primer `await`.
5. **El offset avanza por lo recibido** (`offset + items.length`), nunca `+= pageSize` fijo: una página corta salta títulos.
6. **Fin real por `meta.count`** (o el equivalente), no simulado.
7. **Búsqueda con reinicio total**: limpiar lista, ids, offset, `hasMore` y error; **token de generación** para descartar respuestas y fallos viejos.
8. **`debounce ≥ 400 ms`** en el searchbar (las APIs públicas suelen limitar req/s).
9. **Vacío ≠ error de red**: `200` con `data: []` es "sin resultados"; el `catch` es un fallo.
10. **404 ≠ caída de red** en el detalle: estados distintos y reintento del mismo id.
11. **Favoritos = solo ids** en `@capacitor/preferences` (no guardes objetos que ya viven en la API).
12. **Reiniciar la búsqueda con una carga en vuelo** deja mudo al `ion-infinite-scroll` (Ionic pone `isLoading=false` sin resetear `didFire`) → espera la petición antes de vaciar.
13. **`[disabled]` del scroll incluye `error()` a propósito**: si lo quitas, entra en bucle de reintentos.
14. **Iconos nuevos → `addIcons()` en `main.ts`**, si no, no se ven.
15. **Presupuesto de estilos por componente** (`anyComponentStyle`): 3 kB warning / 6 kB error en `angular.json`.

---

## 4. Progreso por fase

| Fase | Req. | Responsable | Estado |
|---|---|---|---|
| A — PDF + plan + verificación de APIs | — | 🟦 MiMo | 🟡 `PLAN.md` listo, APIs verificadas; **pendiente la URL de MockAPI del estudiante** |
| B — Scaffold + estructura + rutas + deps + siembra de datos | base | 🟦 MiMo | ⬜ |
| C — Listado de incidencias (8 campos, vacío, error) | R2 | 🟪 Gemini | ⬜ |
| D — Paginación remota e incremental | R3 | 🟪 Gemini | ⬜ |
| E — Detalle + transiciones de estado + observación | R9 | 🟪 Gemini | ⬜ |
| F — Formulario de registro + validaciones | R5 | 🟪 Gemini | ⬜ |
| G — Cámara, previsualización y permisos | R6 | 🟪 Gemini | ⬜ |
| H — GPS + coordenadas manuales (bache) | R7 | 🟪 Gemini | ⬜ |
| I — Borrador recuperable (continuar/descartar) | R8 | 🟪 Gemini | ⬜ |
| J — Clima real antes de guardar + aviso > 5 mm | R4 | 🟪 Gemini | ⬜ |
| K — Seguimiento local (Preferences) | R1 | 🟪 Gemini | ⬜ |
| L — Inicio con indicadores + navegación + pulido | R10 | 🟪 Gemini | ⬜ |
| Cierre — APK por terminal + README + evidencias | — | 🟦 MiMo | ⬜ |

---

## 5. Checklist de la rúbrica (binaria: se cumple entero o no vale nada)

- [ ] **R1 (0,8)** — Las marcadas sobreviven al reiniciar la app · sección propia que las lista · desmarcar las quita de ahí **sin tocar la API**.
- [ ] **R2 (1,6)** — Los **8 campos** visibles (código, tipo, descripción, dirección, sector, fecha, estado, foto si existe) · estado **vacío** con mensaje · estado **error** con reintento.
- [ ] **R3 (1,6)** — Paginación **remota** con carga incremental al llegar al final · **cero** peticiones cuando se agota (`hasMore` por `X-Total-Count`) · sin duplicados (NG0955) · `complete()` siempre en `finally`.
- [ ] **R4 (0,8)** — API climática **real** con las coordenadas de la incidencia · temperatura + precipitación última hora (mm) + condición · **aviso si > 5 mm** sin bloquear · fallo informado y se puede continuar.
- [ ] **R5 (1,6)** — La incidencia creada **aparece en la API** · obligatorios validados antes de enviar · **prioridad alta sin foto ⇒ no guarda** · en baja/media la foto es opcional.
- [ ] **R6 (1,6)** — Foto capturada y **previsualizada antes de guardar** · cancelar la captura **no borra el formulario** · permiso denegado explicado e impide guardar incompleto · la foto se ve en el detalle **después** de guardar (URL de la API, no ruta temporal).
- [ ] **R7 (1,6→1,2)** — Coordenadas actuales obtenidas · **bache sin GPS ⇒ coordenadas manuales válidas** (lat −90..90, lon −180..180) · en el resto la ubicación es opcional y siempre cabe la dirección.
- [ ] **R8 (1,2)** — Cerrar la app con el formulario a medias y al reabrirla ofrece **continuar/descartar** · al continuar se conservan los campos capturados.
- [ ] **R9 (1,6)** — Solo transiciones válidas (pendiente→en proceso→resuelta; **resuelta no retrocede**) · resolver **exige observación** · el cambio se lee **después** en la API.
- [ ] **R10 (0,8)** — Inicio con indicadores que **reflejan altas y actualizaciones** · navegación listado→detalle→registro→seguimiento clara · interfaz de campo (contraste, targets ≥ 44 px) · **APK instalado y funcional**.

---

## 6. Arranque (hazlo ANTES de la prueba)

1. `opencode auth login` o `/connect` → **Google** (cuenta con AI Pro) → `/models` → Gemini 3.8 Flash.
   - Si el ID que apara en `/models` difiere de `google/gemini-3.8-flash`, ajústalo en el frontmatter de `.opencode/agents/gemini-ui.md`.
2. Abre una sesión en **esta carpeta** y verifica que cargan los agentes (`mimo-infra`, `gemini-ui`, `deepseek-revisor`) y las 2 skills.
3. Copia el **PDF** a esta carpeta y pídele a MiMo: *"Fase A: lee el PDF y completa la §0 de PLAN.md"*.
4. De ahí en adelante, sigue la §2.1.

---

## 7. Skills + Antigravity + prompts de arranque

### 7.1 Instalación de las skills (las MISMAS en las dos herramientas)

**Fuente única:** `C:\Users\Asus Tuf\Documents\Proyecto\Pruebas\SKILLS_INSTALADAS`
(`deteccion-codigo-muerto` · `pruebas-backend-esfot` · `pruebas-frontend-esfot` · `refactor-seguro`)

| Dónde | Ruta | Quién la lee | ¿Va al repo? |
|---|---|---|---|
| **Repo · workspace** | `Prueba-Moviles/.agents/skills/<skill>/SKILL.md` | **Antigravity** (por defecto) y **OpenCode** (`"skills": [".agents/skills"]`) | ✅ **sí** — al clonar el repo ya vienen |
| **Repo · proyecto** | `Prueba-Moviles/.opencode/skills/<skill>/SKILL.md` | OpenCode | ✅ sí (las 2 nuestras) |
| **Global Antigravity (tu máquina)** | `~/.gemini/config/skills/<skill>/SKILL.md` | Antigravity en **cualquier** proyecto | ❌ no |
| **Global Antigravity CLI** | `~/.gemini/antigravity-cli/skills/` | la CLI de Antigravity (si la usas) | ❌ no |
| **Global OpenCode** | `~/.config/opencode/skills/` | OpenCode en cualquier proyecto | ❌ no |

Comprobación: en **Antigravity**, *Customizations* (panel del agente) debe listar las 4 + las 2;
o pregúntale *"lista mis skills"*. En **OpenCode**: `/skills` o la herramienta `skill`.

> ⚠️ **Instalación hecha ya** (28/10): las 4 están en el workspace **y** en `~/.gemini/config/skills/`.
> Si copias skills de nuevo al global, hazlo **copiando la carpeta entera con su `SKILL.md`**
> (Antigravity ignora cualquier carpeta sin `SKILL.md`) y reinicia la sesión para que las redetecte.

### 7.2 Agentes y subagentes que DEBEN existir antes de empezar

**3 primarios** (uno por sesión; cada uno con su modelo) — en `.opencode/agents/` para OpenCode:

| ID | Modelo | Rol | Skills |
|---|---|---|---|
| `mimo-infra` | `opencode/mimo-v2.6-flash-free` | plan + scaffold + build + git + APK + README | `ionic-app-setup`, `pruebas-frontend-esfot`, `pruebas-backend-esfot` |
| `gemini-ui` | `google/gemini-3.8-flash` | código e interfaz (`src/**`) | **`ui-ionic-design`**, `pruebas-frontend-esfot`, `deteccion-codigo-muerto` |
| `deepseek-revisor` | `opencode/deepseek-v4.1-flash-free` | revisión independiente (solo lectura) | `refactor-seguro`, `deteccion-codigo-muerto`, `pruebas-frontend-esfot` |

**4 subagentes** (solo lectura): `verificador-api` · `verificador-build` · `revisor-rubrica` · `auditor-muerto`.

> En **Antigravity** no hay `.opencode/agents/`: los roles se declaran **en el prompt** (§7.3) y, si tu
> versión permite agentes personalizados (*Customizations → agents*), se crean con **estos mismos 4 nombres
> y modelos** para que ambos programas hablen el mismo idioma.

### 7.3 Prompt de arranque — cópialo tal cual (modo doble ventana)

> Los dos programas se abren **sobre esta misma carpeta** (no hace falta clonar dos veces: es UN árbol).
> Pega el prompt de tu herramienta en su ventana; el protocolo de turnos está en `PLAN.md` §2.3 y en `AGENTS.md`.

**🟢 En OpenCode** (sesión abierta en esta carpeta):

```text
Esta carpeta es el workspace compartido con Antigravity (dos programas, un solo árbol).
Lee AGENTS.md, PLAN.md (§0 requisitos, §1 equipo y skills, §2 reglas y turnos, §3 trampas) y HANDOFF.md.
Fíjate en la fila 🚦 de HANDOFF.md: si no es tu turno, NO escribas nada todavía.
Tu rol por defecto es mimo-infra (raíz, configs, build, git, APK, README).
FASE A: lee el PDF de la prueba que está en la carpeta, completa PLAN.md §0 con los requisitos y sus
puntos, y verifica la API candidata con el subagente verificador-api (HTTP 200, CORS, paginación real).
Al terminar: build verde → actualiza §4 → escribe tu bloque en HANDOFF.md con la 🚦 apuntando al
siguiente → commit atómico (git add <rutas>, nunca git add -A).
Reglas: un solo escritor a la vez · Gemini solo toca src/** · MiMo solo la raíz/configs · DeepSeek no
edita nada · git y npm solo los usa el turno activo (nunca a la vez con la otra ventana).
Usa las skills de PLAN.md §1.1 (ionic-app-setup para crear la app y el APK, pruebas-frontend-esfot para
cerrar fase).
```

**🟣 En Antigravity** (workspace = esta misma carpeta; `AGENTS.md` se carga solo):

```text
Este workspace lo comparte OpenCode: dos programas, un solo árbol de git. AGENTS.md y PLAN.md tienen
las reglas; léelos antes de tocar nada. Las skills están en .agents/skills/ (deteccion-codigo-muerto,
pruebas-backend-esfot, pruebas-frontend-esfot, refactor-seguro) y en .opencode/skills/ (ionic-app-setup,
ui-ionic-design): usa la que indique PLAN.md §1.1 para cada tarea.
Fíjate en la fila 🚦 de HANDOFF.md: si no es tu turno (el tuyo es gemini-ui), esperas — no edites nada.
Tu rol es gemini-ui: programas los requisitos en src/** con la skill ui-ionic-design OBLIGATORIA antes
de cualquier pantalla (nada de ion-card genérico con colores del starter).
Cuando te toque: un requisito por fase → build verde → bloque en HANDOFF.md → commit atómico por rutas
(nunca git add -A). NO toques la raíz ni configs (package.json, angular.json, README, .git): esas son
de mimo-infra.
```

> **Pega el prompt de tu herramienta en su ventana** (son dos, no uno u otro: se usan los dos a la vez).
> El objetivo y las reglas son idénticos, así que ambos programas producen el mismo plan y las mismas
> fases. La fuente del repo es `https://github.com/JimSul16/IniMoviles2026B` (por si hay que re-clonar
> en otra máquina: solo se clona **una** vez y ambas ventanas abren esa misma carpeta).
