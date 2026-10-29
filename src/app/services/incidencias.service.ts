import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import type { Incidencia } from '../models/incidencia.model';

export interface ErrorConsultaIncidencias {
  tipo: 'red' | 'no_encontrado' | 'desconocido';
  status: number;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class IncidenciasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.incidenciasApiUrl;

  /**
   * Consulta una página remota de incidencias en MockAPI.
   * En la fase C se consulta la primera página con límite establecido por environment.pageSize.
   */
  getIncidencias(page = 1, limit = environment.pageSize): Observable<Incidencia[]> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http.get<Incidencia[]>(this.apiUrl, { params }).pipe(
      catchError((error: unknown) => {
        return throwError(() => this.mapearError(error));
      }),
    );
  }

  /**
   * Transforma errores HTTP en estructuras de error tipadas y legibles,
   * diferenciando explícitamente caídas de red (status 0) de recurso no encontrado (404)
   * o fallos del servidor.
   */
  private mapearError(error: unknown): ErrorConsultaIncidencias {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return {
          tipo: 'red',
          status: 0,
          mensaje:
            'No fue posible establecer conexión con el sistema municipal. Compruebe la conexión a internet de su dispositivo.',
        };
      }

      if (error.status === 404) {
        return {
          tipo: 'no_encontrado',
          status: 404,
          mensaje:
            'El recurso solicitado no fue encontrado en el servidor municipal (código 404). Verifique la ruta del servicio (/API).',
        };
      }

      return {
        tipo: 'desconocido',
        status: error.status,
        mensaje: `El servidor municipal respondió con error (HTTP ${error.status}). Por favor intente más tarde.`,
      };
    }

    return {
      tipo: 'desconocido',
      status: -1,
      mensaje: 'Ocurrió un error inesperado al consultar el catálogo de incidencias.',
    };
  }
}
