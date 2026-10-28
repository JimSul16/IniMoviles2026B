---
name: refactor-seguro
description: Protocolo para decidir qué código muerto borrar, qué dejar y qué transformar sin romper el funcionamiento de ESFOT. Incluye la jerarquía de evidencia, la clasificación de riesgo A/B/C/D y la checklist de verificación antes de cualquier borrado. Usar antes de eliminar archivos, exports, endpoints o dependencias.
metadata:
  opencode/autoinvoke: true
---

# Refactor seguro — qué cambiar y qué dejar

## Principio

El objetivo no es "borrar cosas": es **dejar el sistema en un estado que funcione igual o mejor**, con el dead code clasificado y la decisión documentada.

> **Nunca se borra en silencio.** Todo borrado pasa por: evidencia → clasificación → verificación → ejecución.

## Flujo obligatorio (4 pasos)

### 1. Evidencia (obligatoria)
Cada hallazgo lleva el **grep que lo demuestra**:
```
Select-String -Path "<árbol>" -Pattern "\b<simbolo>\b" | Measure-Object
→ 0 referencias fuera de su propio archivo
```
Sin evidencia, no hay hallazgo. La intuición no es evidencia.

### 2. Clasificación de riesgo

| Riesgo | Significado | Acción |
|---|---|---|
| 🟢 **A — Borrable** | 0 referencias, no es punto de entrada, no lo usa ningún script ni test | **Eliminar** + re-verificar |
| 🟡 **B — Documentado** | 0 referencias pero es tooling deliberado (seeds, migraciones, Postman, `tests/verify*`) | **Conservar** + comentario que lo explique |
| 🔴 **C — Bug latente** | El usuario **cree** que está en uso pero nunca se ejecuta (feature muerta) | **Arreglar o documentar** — borrar en silencio oculta el bug |
| ⚫ **D — Peligroso** | Candidato a muerto cuya ausencia rompe algo (contratos, seeds, carga dinámica por string) | **Dejar** + test que lo cubra |

### 3. Verificación (antes y después)
```bash
# Backend
cd Backend && npm test
# Frontend
cd Frontend && npm test && npm run typecheck && npm run build
# Contrato + grafo
# (ver skills pruebas-backend-esfot / pruebas-frontend-esfot)
```
Si el verde se rompe → **se revierte**. No se "arregla de paso" otra cosa.

### 4. Ejecución y registro
Cada cambio se anota en el documento de auditoría: qué se borró, por qué, y qué prueba lo confirma.

## Reglas específicas de ESFOT

1. **Los endpoints se registran por string.** `app.use("/api/graph", graphRoutes)` → para saber si un controller se usa hay que buscar su **import** en `src/routes/*.routes.js`, no su nombre.
2. **Las rutas del frontend se registran por string** en `<Route path="..." />` → buscar también el path.
3. **`src/seeds/`, `src/db/`, `tests/verify*.js` y la colección Postman nunca se borran** (riesgo B).
4. **Un export que un test importa no está muerto**, aunque el runtime no lo use (los tests son consumidores legítimos).
5. **Cuidado con `export *` y los barrels** (`src/api/index.ts`): un export puede parecer no usado y estar reexportado.
6. **Cuidado con el borrado en cascada en Neo4j**: `deleteRouteFromGraph` deja `Module` huérfanos (bug conocido). Si se borra código de rutas, hay que limpiar también los huérfanos del grafo, o el grafo se ensucia más.

## Checklist de "¿esto se puede borrar?"

- [ ] ¿El grep da 0 referencias fuera de su archivo?
- [ ] ¿No es un punto de entrada ni está en un barrel?
- [ ] ¿No lo invoca ningún script (`npm run`), seed, test ni colección Postman?
- [ ] ¿No se referencia por string (ruta, `name`, config)?
- [ ] ¿Tras borrarlo, `npm test` + `typecheck` + `build` siguen verdes?
- [ ] ¿Si es riesgo C, está documentado para el usuario en vez de borrado en silencio?

Si alguna respuesta es "no" o "duda" → **no se borra**, se documenta.
