import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import type { EstadoIncidencia, Incidencia } from '../models/incidencia.model';

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

  private _nuevaIncidenciaRegistrada = false;

  get nuevaIncidenciaRegistrada(): boolean {
    return this._nuevaIncidenciaRegistrada;
  }

  marcarNuevaIncidencia(): void {
    this._nuevaIncidenciaRegistrada = true;
  }

  consumirNuevaIncidencia(): boolean {
    const valor = this._nuevaIncidenciaRegistrada;
    this._nuevaIncidenciaRegistrada = false;
    return valor;
  }

  /**
   * Consulta una página remota de incidencias en MockAPI (R2, R3).
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
   * Obtiene el detalle de una incidencia específica por su ID de MockAPI (R9).
   */
  getIncidenciaById(id: string | number): Observable<Incidencia> {
    return this.http.get<Incidencia>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: unknown) => {
        return throwError(() => this.mapearError(error, id));
      }),
    );
  }

  /**
   * Actualiza el estado y opcionalmente la observación técnica de una incidencia (R9).
   * Persiste el cambio con PATCH hacia MockAPI.
   */
  actualizarEstado(
    id: string | number,
    nuevoEstado: EstadoIncidencia,
    observacion?: string | null,
  ): Observable<Incidencia> {
    const body: Partial<Incidencia> = {
      estado: nuevoEstado,
      ...(observacion !== undefined ? { observacion } : {}),
    };

    return this.http.patch<Incidencia>(`${this.apiUrl}/${id}`, body).pipe(
      catchError((error: unknown) => {
        return throwError(() => this.mapearError(error, id));
      }),
    );
  }

  /**
   * Registra una nueva incidencia en MockAPI (R5).
   */
  crearIncidencia(incidencia: Omit<Incidencia, 'id'>): Observable<Incidencia> {
    return this.http.post<Incidencia>(this.apiUrl, incidencia).pipe(
      tap(() => {
        this.marcarNuevaIncidencia();
      }),
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
  private mapearError(error: unknown, id?: string | number): ErrorConsultaIncidencias {
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
        const detalleId = id ? ` INC-${id}` : '';
        return {
          tipo: 'no_encontrado',
          status: 404,
          mensaje: `La incidencia${detalleId} no fue encontrada en el sistema municipal (código 404).`,
        };
      }

      if (error.status === 429) {
        return {
          tipo: 'desconocido',
          status: 429,
          mensaje: 'Se agotó la cuota del servicio municipal, espere unos minutos para volver a consultar.',
        };
      }

      if (error.status === 413) {
        return {
          tipo: 'desconocido',
          status: 413,
          mensaje: 'La fotografía supera el tamaño permitido por el servidor municipal.',
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
      mensaje: 'Ocurrió un error inesperado al procesar la solicitud con el servidor municipal.',
    };
  }
}
