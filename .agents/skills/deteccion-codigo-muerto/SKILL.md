---
name: deteccion-codigo-muerto
description: Detecta y clasifica código muerto en el proyecto ESFOT (Backend Node/Express + Frontend React/TS): archivos, funciones, exports, componentes, tipos y dependencias que NO se usan en runtime. Usar cuando el usuario pida "código no usado", "dead code", "limpiar lo que no se usa", "qué puedo borrar sin romper nada", o antes de una refactorización grande.
metadata:
  opencode/autoinvoke: true
---

# Detección de código muerto — ESFOT

## Objetivo

Determinar qué archivos, funciones, módulos, componentes y dependencias **no se usan realmente** en el proyecto, clasificarlos por riesgo y proponer qué borrar, qué dejar y qué transformar — **sin romper el funcionamiento**.

## Principio rector: evidencia, no intuición

Un símbolo "no encontrado por grep" **no prueba** que esté muerto. Antes de declarar algo muerto hay que confirmar **las tres capas**:

| Capa | Qué hay que comprobar | Herramienta |
|---|---|---|
| **1. Importaciones** | ¿Nadie lo importa? | `grep` del nombre del símbolo en todo el árbol `src/` |
| **2. Registro / wiring** | ¿Está montado en un router, un `app.use`, un `index.ts` barrel, un `<Routes>`? | lectura de los archivos de entrada |
| **3. Ejecución dinámica** | ¿Se referencia por **string** (ruta, `name`, clave de config, `import()` dinámico, `require()` variable)? | `grep` de la cadena literal |

> ⚠️ En ESFOT los endpoints se registran por **string** (`app.use("/api/graph", graphRoutes)`) y las rutas del frontend por **string** (`<Route path="..." />`). Un `grep` del nombre de la función exportada **no** encuentra estos usos: hay que buscar también el **string de la ruta**.

## Procedimiento

### Paso 1 — Inventario de archivos
```powershell
Get-ChildItem -Recurse -File -Path "Backend\src","Frontend\src" |
  Where-Object { $_.FullName -notmatch 'node_modules' } |
  Select-Object -ExpandProperty FullName
```
Clasificar cada archivo en:
- **Punto de entrada** (se ejecuta siempre): `server.js`, `main.tsx`, `App.tsx`, `index.ts` barrels
- **Alcanzable** (importado desde un punto de entrada, transitivamente)
- **Huérfano** (no importado por nadie)

### Paso 2 — Grafo de imports (reachability)
Para cada archivo, resolver sus imports y hacer el recorrido transitivo desde las entradas.

**Backend** (ESM, imports relativos con extensión `.js`):
```powershell
Select-String -Path "Backend\src\**\*.js" -Pattern "from\s+['\"](\.[^'\"]+)['\"]"
```
**Frontend** (alias `@/` → `src/`):
```powershell
Select-String -Path "Frontend\src\**\*.ts*","Frontend\src\**\*.tsx" -Pattern "from\s+['\"](@/[^'\"]+|\.[^'\"]+)['\"]"
```

Un archivo es **candidato a muerto** si:
- no es punto de entrada, **y**
- ningún archivo alcanzable lo importa.

### Paso 3 — Símbolosexports huérfanos dentro de archivos vivos
Para cada `export` de un archivo alcanzable, contar referencias **fuera de su propio archivo**:
```powershell
Select-String -Path "<todo el árbol>" -Pattern "\b<nombreExportado>\b" | Where-Object { $_.Path -ne "<archivo>" }
```
Cuidado con los **falsos positivos**:
- un export reexportado desde un barrel (`export * from` / `export { x } from`)
- un export consumido por string (dinámico)
- un tipo usado solo por `import type`
- un default export montado por un router

### Paso 4 — Componentes y rutas del frontend
- Componentes en `src/pages/**` sin import: puede que la ruta se monte por lazy import.
- Buscar `lazy(` / `import(` dinámicos.
- `src/shared/` está **vacío** (documentado en `Contexto_General.md`) → candidato trivial.

### Paso 5 — Endpoints del backend
Para cada handler exportado en `src/controllers/`, verificar que su ruta esté en `src/routes/`:
```powershell
Select-String -Path "Backend\src\routes\*.routes.js" -Pattern "router\.(get|post|put|patch|delete)\('"
```
Un controller exportado que **ningún** router importa = endpoint muerto.

### Paso 6 — Dependencias no usadas
```powershell
# Backend
Get-Content "Backend\package.json" | ConvertFrom-Json | Select-Object -ExpandProperty dependencies
# Frontend
Get-Content "Frontend\package.json" | ConvertFrom-Json | Select-Object -ExpandProperty dependencies
```
Para cada dependencia, `grep` su import en el árbol. Sin imports → dependencia no usada.

## Clasificación de riesgo (para decidir qué hacer)

| Riesgo | Definición | Acción propuesta |
|---|---|---|
| 🟢 **A — Borrable** | Archivo o export sin ninguna referencia, sin efecto en runtime, sin script que lo invoque | Eliminar |
| 🟡 **B — Documentado** | Sin referencias pero **deliberadamente**盘点 (tooling, seeds, Postman, scripts de verificación) | Marcar con comentario, no borrar |
| 🔴 **C — Bug latente** | Se cree usado pero **nunca se ejecuta** (feature muerta que el usuario cree activa) | **Arreglar o documentar** — nunca borrar en silencio |
| ⚫ **D — Peligroso** | Candidato a muerto pero su ausencia rompe algo (contratos, seeds, migraciones, reflectivo) | Dejar + test que lo cubra |

## Salida esperada

Un inventario en markdown con, por cada ítem:
`archivo:línea` · símbolo · **evidencia** (grep con nº de referencias) · riesgo A/B/C/D · acción · **test que lo cubre hoy** (o "ninguno").

## Reglas de seguridad

1. **Nunca borrar** seeds (`src/seeds/`), migraciones (`src/db/`), scripts de verificación (`tests/verify*`), ni la colección Postman.
2. **Nunca borrar** un export que un test importe (Jest/Vitest) aunque no lo use el runtime → los tests son consumidores legítimos.
3. Antes de proponer el borrado de un archivo, **confirmar con `npm test` + `npm run build`** que sigue verde.
4. Todo hallazgo se reporta **con la evidencia del grep**, nunca por intuición.
