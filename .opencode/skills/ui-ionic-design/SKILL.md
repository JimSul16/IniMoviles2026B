---
name: UI Ionic — diseño de interfaz móvil
description: Directrices para diseñar la interfaz de API Explorer sin que quede genérica: identidad y paleta, tema claro/oscuro, tarjetas de listado, estados (skeleton, vacío, error), jerarquía tipográfica, accesibilidad táctil y checklist visual. Usar al crear o estilizar páginas, tarjetas, searchbar, detalle o estados.
metadata:
  opencode/autoinvoke: true
---

# UI Ionic — que la interfaz no quede genérica

Regla principal: **nada de aspecto por defecto de Ionic** (el morado `primary` de plantilla, tarjetas planas, spinners idénticos). La app debe tener identidad propia y transmitir "catálogo de anime", no "starter template".

## 1. Identidad (una vez, en `src/theme/variables.scss`)

```scss
:root {
  --ion-color-primary: #6c5ce7;        --ion-color-primary-rgb: 108,92,231;
  --ion-color-primary-contrast: #fff;  --ion-color-primary-shade: #5f51c9;
  --ion-color-primary-tint: #7a6ce9;
  --ion-color-accent: #ff7675;
  --ion-color-medium: #8a94a6;
  --ion-background: #0f1117;           // fondo oscuro por defecto (apps de contenido)
}
```

- Definir SIEMPRE los 5 tonos (`base/rgb/contrast/shade/tint`) si se declara un color custom: si falta alguno, Ionic lanza error en runtime.
- Modo oscuro/claro con las variables `--ion-color-*` de `ion-app`; probar ambos antes de cerrar la fase.
- Tipografía: una sola familia (la de Ionic está bien), jerarquía por **peso** (600/400) y tamaño, no por colores distintos.

## 2. Tarjetas de listado (R1 — es la primera impresión)

```scss
ion-card { border-radius: 14px; overflow: hidden; box-shadow: 0 6px 18px rgb(0 0 0 / .18); }
.portada { aspect-ratio: 2 / 3; width: 100%; object-fit: cover; background: var(--ion-color-medium); }
.titulo  { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
```

- **Fallback si no hay portada**: mostrar el monograma con las iniciales sobre un color derivado del id → nunca un hueco roto.
- Mínimo **2 atributos visibles** (título + año/tipo + rating) — lo exige R1.
- `loading="lazy"` en las imágenes y `alt` descriptivo.
- Toque: `:active { transform: scale(.98) }` con `transition: .15s` → se siente nativa.

## 3. Estados (R5) — nunca un spinner genérico

| Estado | Cómo se ve |
|---|---|
| Cargando | `ion-skeleton-text` con shimmer **en el formato real** (3 tarjetas con portada + 2 líneas) |
| Vacío | Icono + mensaje + acción: "Sin resultados para «X»" con `ion-icon name="search-outline"` |
| Error | Icono `cloud-offline-outline`, texto humano y botón **Reintentar** (≥44 px) |
| Fin de lista | Mensaje discreto "Has llegado al final · 22 515 títulos" en vez de scroll muerto |

`ngSwitch` sobre un getter `estadoActual` (`'cargando' | 'vacio' | 'error' | 'lista'`), no cuatro flags simultáneos.

## 4. Búsqueda (R3)

- `ion-searchbar` con `debounce="400"`, `inputmode="search"`, placeholder concreto ("Buscar anime…").
- Al escribir: conservar el scroll arriba; al haber query, mostrar chip " resultados para «X» ✕" que limpia y recarga.

## 5. Detalle (R4)

- Cabecera con portada de fondo y degradado → el título se lee siempre.
- Bloques: sinopsis (line-clamp 4 + "ver más"), chips de género/año/episodios, rating destacado.
- `ion-back-button` + `routerLink` funcional (el regreso debe restaurar la lista sin perder la página cargada).

## 6. Accesibilidad táctil

- Objetivos ≥ **44×44 px** (botones, filas de favoritos).
- Contraste AA: texto sobre imagen → siempre con degradado o sombra.
- Respetar `prefers-reduced-motion` en animaciones.
- Nombres accesibles en iconos-botón (`aria-label`).

## 7. Layout

- Móvil: 1 columna; ≥ 560 px: 2 columnas de tarjetas (CSS Grid, no media queries por componente).
- **Sin scroll horizontal**: `ion-content { overflow-x: hidden }`.
- Padding consistente: 12/16 px (números pares, nunca 13 px).

## 8. Checklist "¿quedó genérico?" (antes de cerrar fase C o D)

- [ ] El color primario NO es el morado por defecto de la plantilla.
- [ ] Las tarjetas tienen portada con relación de aspecto y fallback.
- [ ] Los estados skeleton / vacío / error están diseñados, no improvisados.
- [ ] El modo oscuro funciona (si aplica) y no hay texto ilegible.
- [ ] No hay texto cortado, imágenes rotas ni scroll horizontal.
- [ ] Botones y filas tocables ≥ 44 px.
- [ ] Se ve bien en 360 px de ancho (mínimo real de móvil).
