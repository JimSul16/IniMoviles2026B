#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
//  Detector de código muerto — ESFOT (Backend Node/ESM + Frontend React/TS)
//  Implementa la skill "deteccion-codigo-muerto" (capas 1→6).
//  NO modifica nada: solo analiza y reporta con evidencia.
//
//  Uso:  node SKILLS_INSTALADAS/deteccion-codigo-muerto/scripts/detectar-codigo-muerto.mjs
//        node ... --json salida.json
// ══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// La raíz del proyecto se localiza subiendo directorios hasta encontrar la
// carpeta `Backend` (antes el script asumía que las skills vivían en la raíz
// del repo; ahora están dentro de `Pruebas/`).
const findProjectRoot = (start) => {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'Backend', 'src'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('No se encontró la raíz del proyecto (se busca una carpeta "Backend/src").');
};

const ROOT = findProjectRoot(path.resolve(path.dirname(fileURLToPath(import.meta.url))));
const BACKEND = path.join(ROOT, 'Backend', 'src');

// La carpeta del frontend se renombró de `Frontend-V1` a `Frontend` (commit
// "consolida el frontend en una sola carpeta"). Se aceptan ambos nombres para
// que el script no se rompa si alguien vuelve a renombrarla.
const FRONTEND_DIR = fs.existsSync(path.join(ROOT, 'Frontend'))
  ? 'Frontend'
  : 'Frontend-V1';

const FRONTEND = path.join(ROOT, FRONTEND_DIR, 'src');

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

// ── utilidades ─────────────────────────────────────────────────────────────
const walk = (dir, exts) => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some(x => e.name.endsWith(x))) out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const read = (p) => fs.readFileSync(p, 'utf8');
const norm = (p) => p.replace(/\\/g, '/');

// ── resolución de imports ──────────────────────────────────────────────────
const IMPORT_RE = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
const BARE_IMPORT_RE = /import\s+['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
// Los barrels reexportan: `export { X } from './X'` y `export * from './X'`
const REEXPORT_RE = /export\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s+['"]([^'"]+)['"]/g;

const parseImports = (src) => {
  const specs = [];
  for (const re of [IMPORT_RE, BARE_IMPORT_RE, DYNAMIC_RE, REEXPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) specs.push({ spec: m[1], dynamic: re === DYNAMIC_RE });
  }
  return specs;
};

// assets no-JS: no son módulos, no cuentan como import sin resolver
const isAsset = (spec) => /\.(css|scss|sass|less|png|jpe?g|svg|gif|webp|ico|woff2?)$/i.test(spec);

// Resuelve un specifier a una ruta real de archivo
const resolveSpec = (fromFile, spec, files) => {
  let base;
  if (spec.startsWith('@/')) base = path.join(FRONTEND, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;                       // paquete externo
  const cands = [base, base + '.js', base + '.ts', base + '.tsx', base + '.jsx',
                 path.join(base, 'index.js'), path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  for (const c of cands) {
    const n = norm(c);
    if (files.includes(n)) return n;
  }
  return null;
};

// ── construcción del grafo ─────────────────────────────────────────────────
const buildGraph = (files, kind) => {
  const graph = new Map();       // file -> Set(imported files)
  const external = new Map();    // file -> Set(packages)
  const dynamic = new Map();     // file -> Set(dynamic specifiers)
  for (const f of files) {
    const src = read(f);
    const deps = new Set();
    const pkgs = new Set();
    const dyn = new Set();
    for (const { spec, dynamic: isDyn } of parseImports(src)) {
      if (isAsset(spec)) continue;
      if (isDyn) { dyn.add(spec); }
      if (!spec.startsWith('.') && !spec.startsWith('@/')) { pkgs.add(spec); continue; }
      const r = resolveSpec(f, spec, files);
      // los import() dinámicos (lazy) SÍ son aristas de alcanzabilidad
      if (r) deps.add(r);
      else deps.add('UNRESOLVED:' + spec);
    }
    graph.set(f, deps);
    external.set(f, pkgs);
    dynamic.set(f, dyn);
  }
  return { graph, external, dynamic, kind };
};

// Recorrido transitivo desde las entradas
const reachable = (g, entries) => {
  const seen = new Set();
  const stack = [...entries];
  const unresolved = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const d of (g.get(cur) || [])) {
      if (typeof d === 'string' && d.startsWith('UNRESOLVED:')) { unresolved.add(cur + ' → ' + d); continue; }
      stack.push(d);
    }
  }
  return { seen, unresolved };
};

// ── extracción de exports ──────────────────────────────────────────────────
const EXPORT_DECL = /export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_LIST = /export\s*\{([^}]*)\}/g;
const EXPORT_DEFAULT = /export\s+default\s+(?:async\s+)?(?:function|class)?\s*([A-Za-z_$][\w$]*)?/g;

const parseExports = (src) => {
  const names = new Set();
  let m;
  EXPORT_DECL.lastIndex = 0;
  while ((m = EXPORT_DECL.exec(src))) names.add(m[1]);
  EXPORT_LIST.lastIndex = 0;
  while ((m = EXPORT_LIST.exec(src))) {
    for (const part of m[1].split(',')) {
      const nm = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (nm && nm !== 'default') names.add(nm);
    }
  }
  EXPORT_DEFAULT.lastIndex = 0;
  while ((m = EXPORT_DEFAULT.exec(src))) if (m[1]) names.add(m[1]);
  return [...names];
};

// ¿la línea es un import/reexport? (para no contar la referencia "de importación")
const isImportLine = (line) => /^\s*(import|export)\s.*from\s+['"]/.test(line) || /^\s*import\s+['"]/.test(line);

// Aplana los import/export-from multilínea a una sola línea, para que el
// análisis "por línea" detecte correctamente `import { a, b } from '...'`.
const flattenImports = (src) =>
  src.replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/g, (m) => m.replace(/\s+/g, ' ').trim())
     .replace(/export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/g, (m) => m.replace(/\s+/g, ' ').trim());

// Alias de import namespace: `import * as authCtrl from '...'` → los miembros
// se consumen como `authCtrl.register`, así que el nombre desnudo NUNCA aparece
// en una sentencia de import. Sin esto, los controllers parecerían "usados solo
// dentro de su propio archivo".
const nsAliases = (src) => [...src.matchAll(/import\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from/g)].map(m => m[1]);

const countUsages = (name, files, ownFile) => {
  const re = new RegExp('\\b' + name.replace(/[$]/g, '\\$') + '\\b', 'g');
  let internalUses = 0, externalUses = 0;
  const importers = [];
  for (const f of files) {
    const raw = read(f);
    const ns = nsAliases(raw);
    const lines = flattenImports(raw).split('\n');
    let inFile = 0, imported = false;
    for (const line of lines) {
      re.lastIndex = 0;
      const hits = (line.match(re) || []).length;
      if (!hits) continue;
      if (isImportLine(line)) { if (f !== ownFile) imported = true; continue; }
      // la propia línea de declaración no cuenta como "uso"
      if (f === ownFile && /^\s*export\s/.test(line)) continue;
      // consumo vía namespace: `authCtrl.register`
      const viaNs = ns.some(alias => new RegExp('\\b' + alias + '\\.' + name.replace(/[$]/g, '\\$') + '\\b').test(line));
      if (viaNs) { if (f !== ownFile) imported = true; inFile += hits; continue; }
      inFile += hits;
    }
    if (f === ownFile) internalUses += inFile;
    else {
      externalUses += inFile;
      if (imported) importers.push(rel(f));
    }
  }
  return { internalUses, externalUses, importers };
};

// ── análisis ───────────────────────────────────────────────────────────────
const analyze = (label, dir, exts, entriesRel) => {
  const files = walk(dir, exts).map(norm);
  const { graph, external, dynamic } = buildGraph(files, label);
  const entries = entriesRel.map(e => norm(path.join(dir, e)));
  const { seen, unresolved } = reachable(graph, entries);
  const orphans = files.filter(f => !seen.has(f));

  // exports sin uso real — se distinguen 3 casos
  const unusedExports = [];   // SIN USO TOTAL (código muerto)
  const internalOnly = [];    // usado solo dentro de su archivo (el `export` sobra)
  const testOnly = [];        // solo lo consumen los tests
  for (const f of files) {
    if (!seen.has(f)) continue;
    const src = read(f);
    for (const name of parseExports(src)) {
      const { internalUses, externalUses, importers } = countUsages(name, files, f);
      const consumers = importers.filter(i => i !== rel(f));
      const testConsumers = consumers.filter(i => /\.test\.|\.spec\.|__tests__/.test(i));
      const realConsumers = consumers.filter(i => !/\.test\.|\.spec\.|__tests__/.test(i));
      if (realConsumers.length === 0 && testConsumers.length === 0) {
        if (internalUses > 0) {
          internalOnly.push({ file: rel(f), name, evidence: `usado ${internalUses}× solo dentro del mismo archivo (el \`export\` es innecesario, el código NO está muerto)` });
        } else {
          unusedExports.push({ file: rel(f), name, evidence: '0 referencias en todo el proyecto' });
        }
      } else if (realConsumers.length === 0 && testConsumers.length > 0) {
        testOnly.push({ file: rel(f), name, evidence: `solo lo usan los tests: ${testConsumers.join(', ')}` });
      } else if (realConsumers.length > 0 && externalUses === 0) {
        testOnly.push({ file: rel(f), name, evidence: `importado en ${realConsumers.join(', ')} pero nunca usado en el cuerpo` });
      }
    }
  }

  // paquetes externos importados
  const pkgs = new Set();
  for (const set of external.values()) for (const p of set) {
    const m = p.match(/^(@[^/]+\/[^/]+|[^/]+)/);
    if (m) pkgs.add(m[1]);
  }

  return { label, files, entries: entriesRel, reachable: seen, orphans: orphans.map(rel), unusedExports, internalOnly, testOnly, packages: [...pkgs], unresolved: [...unresolved], dynamic };
};

// ── ejecución ──────────────────────────────────────────────────────────────
const backend = analyze('Backend', BACKEND, ['.js'],
  ['server.js', 'seeds/seedKnowledgeGraph.js', 'seeds/seedRedes.js', 'seeds/seedAplicacionesWeb.js', 'db/migrate.js']);

const frontend = analyze('Frontend', FRONTEND, ['.ts', '.tsx'],
  ['main.tsx', 'App.tsx', 'api/index.ts', 'types/index.ts', 'context/AuthProvider.tsx', 'hooks/useAuth.ts']);

// ── controladores no montados en ningún router ────────────────────────────
const ctrlDir = path.join(BACKEND, 'controllers');
const routeDir = path.join(BACKEND, 'routes');
const ctrlFiles = fs.existsSync(ctrlDir) ? walk(ctrlDir, ['.js']) : [];
const routeSrc = fs.existsSync(routeDir) ? walk(routeDir, ['.js']).map(read).join('\n') : '';
const orphanControllers = [];
for (const c of ctrlFiles) {
  const src = read(c);
  const names = parseExports(src);
  const notMounted = names.filter(n => !new RegExp('\\b' + n + '\\b').test(routeSrc));
  if (notMounted.length) orphanControllers.push({ file: rel(c), notMounted });
}

// ── dependencias declaradas vs importadas ─────────────────────────────────
const depCheck = (pkgFile, srcDir, exts) => {
  const pkg = JSON.parse(read(pkgFile));
  const declared = Object.keys(pkg.dependencies || {});
  const dev = Object.keys(pkg.devDependencies || {});
  const files = walk(srcDir, exts).map(norm);
  const used = new Set();
  for (const f of files) {
    const src = read(f);
    for (const { spec } of parseImports(src)) {
      if (spec.startsWith('.') || spec.startsWith('@/')) continue;
      const m = spec.match(/^(@[^/]+\/[^/]+|[^/]+)/);
      if (m) used.add(m[1]);
    }
    // `createRequire(import.meta.url)` + `require('pkg')`: los módulos ESM
    // también pueden cargar paquetes CJS de esa forma (ej. `pdf-parse` en
    // `resourceParser.service.js`). Sin esto, la dependencia se marca como
    // muerta cuando en realidad se usa.
    const reqRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = reqRe.exec(src)) !== null) {
      const spec = match[1];
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      const m = spec.match(/^(@[^/]+\/[^/]+|[^/]+)/);
      if (m) used.add(m[1]);
    }
  }
  // algunas deps se usan en scripts/tests/config fuera de src
  const extraDirs = [path.join(path.dirname(pkgFile), 'tests'), path.join(path.dirname(pkgFile), 'postman')];
  for (const d of extraDirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of walk(d, ['.js', '.ts', '.tsx', '.mjs'])) {
      const src = read(f);
      for (const { spec } of parseImports(src)) {
        if (spec.startsWith('.') || spec.startsWith('@/')) continue;
        const m = spec.match(/^(@[^/]+\/[^/]+|[^/]+)/);
        if (m) used.add(m[1]);
      }
    }
  }
  return {
    declared, dev, used: [...used],
    unused: declared.filter(d => !used.has(d)),
  };
};

const backendDeps = depCheck(path.join(ROOT, 'Backend', 'package.json'), BACKEND, ['.js']);
const frontendDeps = depCheck(path.join(ROOT, FRONTEND_DIR, 'package.json'), FRONTEND, ['.ts', '.tsx']);

// ── reporte ────────────────────────────────────────────────────────────────
const L = [];
L.push('# Inventario de código muerto — ESFOT');
L.push('');
L.push(`Generado el ${new Date().toISOString()}`);
L.push('');

for (const [name, a] of [['BACKEND', backend], ['FRONTEND', frontend]]) {
  L.push(`## ${name}`);
  L.push('');
  L.push(`- Archivos analizados: **${a.files.length}**`);
  L.push(`- Alcanzables desde las entradas: **${a.reachable.size}**`);
  L.push(`- **Huérfanos (no importados por nadie): ${a.orphans.length}**`);
  L.push(`- Exports sin uso: **${a.unusedExports.length}**`);
  if (a.unresolved.length) {
    L.push(`- Imports sin resolver (⚠️ revisar): **${a.unresolved.length}**`);
    a.unresolved.slice(0, 10).forEach(u => L.push(`  - \`${u}\``));
  }
  L.push('');
  if (a.orphans.length) {
    L.push('### Archivos huérfanos');
    L.push('');
    L.push('| Archivo | ¿Test lo importa? | Riesgo |');
    L.push('|---|---|---|');
    for (const o of a.orphans) {
      const importedByTest = /tests\/|\.test\.|\.spec\./.test(o);
      L.push(`| \`${o}\` | ${importedByTest ? 'sí' : 'no'} | ${importedByTest ? '🟡 B' : '🟢 A'} |`);
    }
    L.push('');
  }
  if (a.unusedExports.length) {
    L.push('### 🔴 Exports realmente MUERTOS (0 referencias en todo el proyecto)');
    L.push('');
    L.push('| Export | Archivo | Evidencia |');
    L.push('|---|---|---|');
    a.unusedExports.forEach(u => L.push(`| \`${u.name}\` | \`${u.file}\` | ${u.evidence} |`));
    L.push('');
  }
  if (a.testOnly.length) {
    L.push('### 🟡 Exports solo consumidos por tests (o importados y no usados)');
    L.push('');
    L.push('| Export | Archivo | Evidencia |');
    L.push('|---|---|---|');
    a.testOnly.forEach(u => L.push(`| \`${u.name}\` | \`${u.file}\` | ${u.evidence} |`));
    L.push('');
  }
  if (a.internalOnly.length) {
    L.push('### ⚪ Exports usados solo dentro de su propio archivo (el `export` sobra, el código está vivo)');
    L.push('');
    L.push('| Export | Archivo | Evidencia |');
    L.push('|---|---|---|');
    a.internalOnly.forEach(u => L.push(`| \`${u.name}\` | \`${u.file}\` | ${u.evidence} |`));
    L.push('');
  }
}

L.push('## Backend — controladores no montados en ningún router');
L.push('');
if (!orphanControllers.length) L.push('_(ninguno)_');
for (const c of orphanControllers) {
  L.push(`- \`${c.file}\` → sin uso: ${c.notMounted.map(n => '`' + n + '`').join(', ')}`);
}
L.push('');

L.push('## Dependencias declaradas pero no importadas');
L.push('');
L.push('| Paquete | Dónde | Riesgo |');
L.push('|---|---|---|');
backendDeps.unused.forEach(d => L.push(`| \`${d}\` | Backend | 🟢 A |`));
frontendDeps.unused.forEach(d => L.push(`| \`${d}\` | Frontend | 🟢 A |`));
L.push('');

const result = { backend, frontend, orphanControllers, backendDeps, frontendDeps };
if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(result, null, 2)); console.log('JSON → ' + jsonOut); }
console.log(L.join('\n'));
