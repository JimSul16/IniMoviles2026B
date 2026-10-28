import { provideHttpClient, withFetch } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app.routes';

/**
 * Configuración de la app (R7 base).
 * Angular 22 corre **zoneless**: no hay `zone.js`, así que tampoco se registran
 * providers de zona ni de animaciones.
 * `provideHttpClient(withFetch())` es imprescindible: sin él, inyectar `HttpClient`
 * lanza `NullInjectorError` en runtime (trampa ionic-app-setup §7.3).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(withFetch()),
  ],
};
