import type { Routes } from '@angular/router';

/**
 * Navegación de UrbanInspect (R10): inicio con indicadores → listado → detalle → registro,
 * más la sección propia de seguimiento local (R1).
 * Todas las páginas son standalone y se cargan perezosamente con `loadComponent`.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'incidencias',
    loadComponent: () => import('./pages/listado/listado.page').then((m) => m.ListadoPage),
  },
  {
    path: 'seguimiento',
    loadComponent: () => import('./pages/seguimiento/seguimiento.page').then((m) => m.SeguimientoPage),
  },
  {
    path: 'incidencia/:id',
    loadComponent: () => import('./pages/detalle/detalle.page').then((m) => m.DetallePage),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },
  { path: '**', redirectTo: '' },
];
