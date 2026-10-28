---
name: pruebas-backend-esfot
description: Playbook de pruebas del backend ESFOT (Node 22 + Express 5 + libSQL/Turso + Neo4j AuraDB). Úsalo para ejecutar la suite Jest, la colección Postman/Newman, pruebas de contrato frontend-backend, smoke tests contra la instancia de grafos y verificación de datos en Neo4j. Menciona "probar el backend", "correr los tests", "Newman", "Postman", "smoke test del grafo" o "verificar que el backend funciona".
metadata:
  opencode/autoinvoke: true
---

# Pruebas del backend — ESFOT

## Stack y entry points

| Dato | Valor |
|---|---|
| Runtime | Node 22, ESM (`"type": "module"`) |
| Framework | Express 5 (`src/server.js` es el único entry point) |
| BD relacional | libSQL / Turso → `Backend/src/config/turso.js` |
| BD de grafos | Neo4j AuraDB 5.27 → `Backend/src/services/neo4j.service.js` |
| Puerto | 3000 (`PORT` en `.env`) |
| Tests | Jest (`npm test` → `node --experimental-vm-modules node_modules/jest/bin/jest.js`) |
| E2E API | Colección Postman + Newman 6.2.3 |

## Orden de ejecución (de más rápido a más lento)

```bash
# 1) Unitarios (6 s)
cd Backend && npm test

# 2) Arranque + salud  (el servidor imprime "✅ Conectado a Neo4j AuraDB")
node src/server.js

# 3) Smoke del grafo (ver más abajo)
# 4) Colección Newman (14 s, 64 requests, 114 asserts)
# 5) Contrato frontend↔backend
```

## 🔴 Trampa conocida: Newman 6.2.3 y la prioridad de variables

**En Newman ≥ 6, la variable de ENTORNO tiene prioridad sobre la de COLECCIÓN.**
Si el entorno declara `auth_token: ""`, el `pm.collectionVariables.set('auth_token', …)` de la colección **queda anulado** y todas las peticiones autenticadas devuelven `401` (en cascada).

**Regla:** el entorno de Newman **no debe declarar** ninguna variable que la colección setea. En `ESFOT_API.postman_collection.json` la colección setea:
`register_email, auth_token, token_admin, token_student, user_id, test_user_email, created_user_id, resource_id, route_id, module_id, enrollment_id, ai_route_id, pdf_url, portada_url, chat_session_id, assessment_question_count, subject_id, topic_id, adaptive_route_id`.

**Segunda trampa:** la colección setea `token_admin` **XOR** `token_student` (rama `else`). Para que funcionen las peticiones de estudiante hace falta una cuenta con **ambos roles**, o dos cuentas y dos logins.

## Login 2FA automatizable

El OTP se guarda **en claro** en `User.otpCode` (Turso) → se puede leer de la BD en vez de esperar el correo:
```js
const db = createClient({ url: 'file:./dev.db' });
const r = await db.execute({ sql: 'SELECT otpCode FROM User WHERE email = ?', args: [email] });
```
Flujo: `POST /api/auth/login` sin `otp` → `206` + genera OTP → leer `otpCode` → `POST /api/auth/login` con `otp` → `200` + token.

## Smoke test del grafo (Neo4j)

```js
// Verificación de escritura: usar la MISMA URI del .env
MATCH (n) WITH count(n) AS nodos MATCH ()-[r]->() RETURN nodos, count(r)
```
Esperado con la instancia restaurada: **146 nodos / 131 relaciones** (estado del snapshot).

Chequeos de integridad del grafo:
```cypher
// 0 = bug conocido (COMPLETED/STRUGGLES_WITH nunca llegan al Topic)
MATCH (t:Topic) WHERE ()-[:COMPLETED]->(t) RETURN count(t)
// huérfanos: Module runtime sin (:LearningRoute)-[:CONTAINS]->()
MATCH (m:Module) WHERE m.id IS NULL AND NOT (m)<-[:CONTAINS]-() RETURN count(m)
```

## Contrato frontend↔backend

Validar cada respuesta contra los tipos de `Frontend/src/types/index.ts`. Los endpoints del grafo:
`GET /api/graph/subjects` · `GET /api/graph/subjects/:id/topics` · `POST /api/graph/self-diagnosis` ·
`POST /api/graph/generate-personalized-route` · `GET /api/graph/recommendations` · `GET /api/graph/topic/:id/context`

## Criterios de "verde"

| Nivel | Criterio |
|---|---|
| Unitarios | 19/19 |
| Newman | 114 asserts, 0 fallos **reales** (los fallos por env-blocked —Cloudinary/JDoodle— no cuentan) |
| Contrato | 0 fallos de forma; los avisos de valor (ej. `matchScore` fuera de escala) sí cuentan |
| Grafo | conteos y props idénticos al origen del backup |
