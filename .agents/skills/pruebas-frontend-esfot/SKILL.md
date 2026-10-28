---
name: pruebas-frontend-esfot
description: Playbook de pruebas del frontend ESFOT (React 19 + TypeScript + Vite 8 + Vitest 5 + Tailwind 4). Úsalo para correr vitest, typecheck, eslint, build, validar el contrato de la capa API y comprobar la integración real frontend→backend con Vite, CORS y preflight. Menciona "probar el frontend", "correr los tests del front", "typecheck", "build del front" o "el front no me funciona".
metadata:
  opencode/autoinvoke: true
---

# Pruebas del frontend — ESFOT

## Stack

| Dato | Valor |
|---|---|
| Framework | React 19 + React Router 7 |
| Lenguaje | TypeScript (`src/` es 100 % TS/TSX) |
| Bundler | Vite 8 (`rolldown`) |
| Tests | Vitest 5 + Testing Library + jsdom |
| Tipos | `src/types/index.ts` — **fuente de verdad del contrato** |
| Capa API | `src/api/*.ts` sobre axios (`src/api/httpClient.ts`) |
| Alias | `@/` → `src/` (vite.config.ts + tsconfig) |
| URL de API | `VITE_API_URL=http://localhost:3000/api` (`.env`) |

## Orden de ejecución

```bash
cd Frontend
npm test          # vitest run  → 105 tests / 17 archivos
npm run typecheck # tsc --noEmit → debe dar 0 errores
npm run lint      # eslint . && oxlint  → 0 errores (ESLint cubre los *.config.js; oxlint cubre los 92 .ts/.tsx)
npm run build     # vite build   → debe compilar
```

## Integración real frontend → backend

El frontend usa **URL absoluta** (`VITE_API_URL`), **no** el proxy de Vite. El proxy de `vite.config.ts` (`/api` → `http://localhost:3000`) solo aplica si `VITE_API_URL` no está definido. Aun así conviene probarlo, porque es el mecanismo de desarrollo por defecto.

```bash
# Backend
cd Backend && node src/server.js
# Frontend
cd Frontend && npx vite --port 5173 --host 127.0.0.1
```
Comprobaciones:
1. `GET http://127.0.0.1:5173/` → 200 con el HTML de la app
2. `GET http://127.0.0.1:5173/api/graph/subjects` → llega al backend por el proxy
3. `OPTIONS http://localhost:3000/api/...` con `Origin: http://localhost:5173` → 200 con `Access-Control-Allow-Origin`
4. `Origin` no permitido → el backend responde 200 pero con `allow-origin` = `FRONTEND_URL` (el navegador lo bloquea: no es una fuga)

## Contrato: la regla de oro

**Toda respuesta de la API se valida contra `src/types/index.ts`.** Si el backend cambia la forma, el tipo miente y el fallo aparece en runtime, no en compilación.

Trampas reales detectadas en este proyecto:
- El grafo usa **`name`**, no `title`, en `Topic` (`GraphTopic` vs el tipo muerto `Topic`).
- `Subject` usa **`moduleCount` / `topicCount`** (no `modulesCount`).
- `LearningRoute.id` y `Module.id` son **`number` en runtime** pero están tipados como `string`.
- `GraphRecommendation.matchScore` viene en escala **0-1** (0.85) pero el tipo dice 0-100 y el front hace `Math.round()` → mostraría "1% de afinidad".

## Escribir tests para código no usado

Ver la skill `deteccion-codigo-muerto`. Reglas específicas del frontend:
- Un componente sin import en `src/pages/**` **puede** estar montado por `lazy()` → buscar `lazy(` y `import(`.
- `src/shared/` está vacío (documentado) → borrar la carpeta es seguro.
- Un tipo sin referencias (`Topic`, `TopicPrerequisite`) es **mentira de tipos**: o se borra o se corrige para que no engañe.

## Criterios de "verde"

| Nivel | Criterio |
|---|---|
| Vitest | 105/105 |
| Typecheck | 0 errores |
| Lint | 0 **errores** (los `warning` de `jsx-a11y` pendientes son backlog conocido) |
| Build | compila (los avisos de `chunk > 500 kB` no son fallos) |
| Contrato | 0 fallos de forma |
