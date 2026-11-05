import type { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';

/**
 * Navegación de UrbanInspect (R10): inicio con indicadores → listado → detalle → registro,
 * más la sección propia de seguimiento local (R1) y autenticación (Firebase Auth).
 * Todas las páginas son standalone y se cargan perezosamente con `loadComponent`.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'incidencias',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/listado/listado.page').then((m) => m.ListadoPage),
  },
  {
    path: 'seguimiento',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/seguimiento/seguimiento.page').then((m) => m.SeguimientoPage),
  },
  {
    path: 'incidencia/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/detalle/detalle.page').then((m) => m.DetallePage),
  },
  {
    path: 'registro',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },
  { path: '**', redirectTo: '' },
];
