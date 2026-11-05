import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Guardián de rutas protegidas de UrbanInspect.
 *
 * Protege el acceso a las operaciones de campo (listado, registro, detalle, seguimiento).
 * Si el usuario no ha iniciado sesión, restaura la sesión persistente de Preferences o
 * redirige a /login conservando la URL de destino (returnUrl).
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    await authService.restaurarSesion();
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
