# PLAN DE TRABAJO — Prueba de Aplicaciones Móviles

> Modelo de plan heredado de **API Explorer** (22/10 → 28/10, 100/100 de requisitos, APK 4,44 MB).
> Rellena la §0 con el **PDF de la prueba** antes de empezar cualquier fase.
> Equipo: 🟪 **Gemini 3.8 Flash** (Antigravity) · 🟦 **MiMo** · 🟩 **DeepSeek**

---

## 0. Requisitos de la prueba ← **Rellenar con el PDF**

> Pega aquí el enunciado resumido. Regla: un requisito = una fila = una fase = un commit.

| Req. | Qué pide el PDF | Pts | Fase | Responsable |
|---|---|---|---|---|
| R1 | *(del PDF)* | | C | 🟪 Gemini |
| R2 | *(del PDF)* | | D | 🟪 Gemini |
| R3 | *(del PDF)* | | E | 🟪 Gemini |
| … | | | | |

| Decisión | Elección | Motivo |
|---|---|---|
| API | *(verificar antes de escribir código)* | debe responder desde la red local, sin clave y con CORS |
| Descartada | *(por qué)* | |
| Stack | Ionic + Angular standalone + Capacitor | el mismo que la vez pasada: ya está verificado |
| Tiempo | *(según el PDF)* | |

### 0.1 Cómo se decide la API (hacerlo ANTES de todo)
1. Probar los endpoints con el subagente `verificador-api`: HTTP 200, CORS `ACAO`, paginación real y campos suficientes.
2. Regla del **fin real de datos**: `offset + pageLimit >= total` (o el equivalente de la API). **Nunca** simular el fin repitiendo la misma petición.
3. Si la API no responde → respaldos probados: **Open Library**, **AniList**, **Kitsu**.

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
| A — PDF + plan + endpoints | — | 🟦 MiMo | ⬜ |
| B — Scaffold + estructura | R7 base | 🟦 MiMo | ⬜ |
| C | R1 | 🟪 Gemini | ⬜ |
| D | R2 | 🟪 Gemini | ⬜ |
| E | R3 | 🟪 Gemini | ⬜ |
| … | | | |
| Cierre — APK + README + evidencias | | 🟦 MiMo | ⬜ |

---

## 5. Checklist de la rúbrica (rellenar con los puntos del PDF)

- [ ] Consumo real de API + modelo/servicio separados
- [ ] Scroll/paginación robustos (sin duplicados, `complete()` garantizado, fin real)
- [ ] Búsqueda con reinicio
- [ ] Navegación y detalle con `:id` + regreso
- [ ] Estados: carga, vacío, error y reintento
- [ ] Persistencia local (Preferences)
- [ ] README + GitHub + evidencia visual

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

### 7.3 Prompt de arranque — cópialo tal cual

**🟢 En OpenCode** (sesión abierta en esta carpeta):

```text
Clona el repo https://github.com/JimSul16/IniMoviles2026B en esta carpeta si aún no está y abre el proyecto.
Lee PLAN.md (§0 requisitos, §1 equipo y skills, §2 reglas, §3 trampas) y HANDOFF.md.
Selecciona el agente mimo-infra y ejecuta la FASE A: lee el PDF de la prueba que está en la carpeta,
completa PLAN.md §0 con los requisitos y sus puntos, y verifica la API candidata con el subagente
verificador-api. NO escribas código todavía.
Reglas: un solo escritor a la vez · 🟪 Gemini solo toca src/** · 🟦 MiMo solo la raíz/configs ·
🟩 DeepSeek no edita nada · build verde antes de cada commit · commit atómico por fase (nunca git add -A).
Usa las skills indicadas en PLAN.md §1.1 (ionic-app-setup para crear la app y el APK,
ui-ionic-design antes de cualquier pantalla, pruebas-frontend-esfot para dar una fase por cerrada).
```

**🟣 En Antigravity** (workspace = esta carpeta):

```text
Este workspace tiene el plan del proyecto en PLAN.md y las skills en .agents/skills/
(ionic-app-setup, ui-ionic-design, pruebas-frontend-esfot, pruebas-backend-esfot, refactor-seguro,
deteccion-codigo-muerto). Léelas antes de trabajar y usa la que indique PLAN.md §1.1 para cada tarea.
Si el repo no está clonado, clónalo desde https://github.com/JimSul16/IniMoviles2026B.
Tarea: FASE A — leer el PDF de la prueba, completar PLAN.md §0 (requisitos + puntos) y verificar la API
con los criterios de §0.1. No programes nada en esta tarea.
Roles del equipo (respétalos): mimo-infra = plan/scaffold/build/APK · gemini-ui = código e interfaz ·
deepseek-revisor = revisión de solo lectura. Un solo escritor a la vez; commit atómico por fase.
```

> Sustituye `https://github.com/JimSul16/IniMoviles2026B` por la URL real de GitHub. **Pega uno u otro según la herramienta**: el objetivo
> y las reglas son idénticos, así que ambos programas producen el mismo plan y las mismas fases.
