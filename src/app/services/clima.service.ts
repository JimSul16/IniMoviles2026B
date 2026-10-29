import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

export interface ClimaInfo {
  temperatura: number;
  precipitacion: number;
  codigoWmo: number;
  descripcion: string;
  alertaLluvia: boolean;
  icono: string;
}

export interface ErrorClima {
  mensaje: string;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    weather_code?: number;
  };
}

/**
 * Servicio Meteorológico en Tiempo Real (R4, 0,8 pts).
 *
 * Consulta Open-Meteo con las coordenadas de la incidencia (o Quito Centro como fallback).
 * Muestra temperatura actual, precipitación acumulada de la última hora (mm) y descripción.
 * Si la lluvia supera 5 mm/h, emite advertencia de mantenimiento sin bloquear el registro.
 */
@Injectable({
  providedIn: 'root',
})
export class ClimaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.climaApiUrl;

  /** Coordenadas de referencia para el DMQ (Plaza Grande, Centro de Quito) */
  readonly quitoCentroLat = -0.1807;
  readonly quitoCentroLon = -78.4678;

  consultarClima(lat?: number | null, lon?: number | null): Observable<ClimaInfo> {
    const latitud = typeof lat === 'number' && !isNaN(lat) ? lat : this.quitoCentroLat;
    const longitud = typeof lon === 'number' && !isNaN(lon) ? lon : this.quitoCentroLon;

    const params = new HttpParams()
      .set('latitude', latitud.toString())
      .set('longitude', longitud.toString())
      .set('current', 'temperature_2m,precipitation,weather_code')
      .set('timezone', 'auto');

    return this.http.get<OpenMeteoResponse>(this.apiUrl, { params }).pipe(
      map((res) => {
        const cur = res?.current;
        if (
          !cur ||
          typeof cur.temperature_2m !== 'number' ||
          isNaN(cur.temperature_2m) ||
          typeof cur.precipitation !== 'number' ||
          isNaN(cur.precipitation)
        ) {
          throw {
            mensaje:
              'Open-Meteo no devolvió datos válidos para esta ubicación. Puede continuar con el registro municipal.',
          } as ErrorClima;
        }

        const temperatura = cur.temperature_2m;
        const precipitacion = cur.precipitation;
        const codigoWmo = typeof cur.weather_code === 'number' && !isNaN(cur.weather_code) ? cur.weather_code : 0;
        const { descripcion, icono } = this.traducirCodigoWmo(codigoWmo);

        return {
          temperatura,
          precipitacion,
          codigoWmo,
          descripcion,
          alertaLluvia: precipitacion > 5,
          icono,
        };
      }),
      catchError((err: unknown) => {
        const errorClima = err as ErrorClima;
        return throwError(
          () =>
            ({
              mensaje:
                errorClima?.mensaje ||
                'No fue posible obtener el reporte meteorológico en tiempo real desde Open-Meteo. Puede continuar con el registro municipal.',
            }) satisfies ErrorClima,
        );
      }),
    );
  }

  /**
   * Traduce códigos meteorológicos oficiales WMO a texto legible en español e icono representativo.
   */
  traducirCodigoWmo(codigo: number): { descripcion: string; icono: string } {
    switch (codigo) {
      case 0:
        return { descripcion: 'Cielo despejado', icono: 'sunny-outline' };
      case 1:
      case 2:
        return { descripcion: 'Parcialmente nublado', icono: 'partly-sunny-outline' };
      case 3:
        return { descripcion: 'Nublado', icono: 'cloud-outline' };
      case 45:
      case 48:
        return { descripcion: 'Neblina sobre la vía', icono: 'cloudy-outline' };
      case 51:
      case 53:
      case 55:
        return { descripcion: 'Llovizna leve', icono: 'rainy-outline' };
      case 61:
      case 63:
      case 65:
        return { descripcion: 'Lluvia constante', icono: 'rainy-outline' };
      case 80:
      case 81:
      case 82:
        return { descripcion: 'Chubascos fuertes', icono: 'rainy-outline' };
      case 95:
      case 96:
      case 99:
        return { descripcion: 'Tormenta eléctrica', icono: 'thunderstorm-outline' };
      default:
        return { descripcion: 'Condición variable', icono: 'partly-sunny-outline' };
    }
  }
}
