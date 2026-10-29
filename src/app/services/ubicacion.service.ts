import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

export interface Coordenadas {
  lat: number;
  lon: number;
}

export interface ErrorUbicacion {
  tipo: 'permiso_denegado' | 'no_disponible' | 'timeout' | 'error_desconocido';
  mensaje: string;
}

/**
 * Servicio de Geolocalización (R7, 1,2 pts).
 *
 * Obtiene las coordenadas GPS actuales usando @capacitor/geolocation.
 * Si el sensor o permiso falla, permite ingresar coordenadas manuales válidas
 * (lat -90..90, lon -180..180), obligatorias cuando el tipo de incidencia es 'bache'.
 */
@Injectable({
  providedIn: 'root',
})
export class UbicacionService {
  /**
   * Obtiene la posición GPS actual del dispositivo.
   */
  async obtenerPosicionActual(): Promise<Coordenadas> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const lat = Number(position.coords.latitude.toFixed(6));
      const lon = Number(position.coords.longitude.toFixed(6));

      return { lat, lon };
    } catch (err: unknown) {
      const errObj = err as { message?: string; code?: number };
      const msg = errObj?.message?.toLowerCase() || '';

      if (msg.includes('denied') || msg.includes('permission') || errObj?.code === 1) {
        throw {
          tipo: 'permiso_denegado',
          mensaje: 'Permiso de geolocalización denegado. Puede ingresar las coordenadas geográficas de forma manual.',
        } satisfies ErrorUbicacion;
      }

      if (msg.includes('timeout') || errObj?.code === 3) {
        throw {
          tipo: 'timeout',
          mensaje: 'Tiempo de espera agotado al consultar el sensor GPS. Ingrese las coordenadas manualmente.',
        } satisfies ErrorUbicacion;
      }

      throw {
        tipo: 'no_disponible',
        mensaje: 'No fue posible obtener la señal de satélite GPS. Por favor ingrese las coordenadas manualmente.',
      } satisfies ErrorUbicacion;
    }
  }

  /**
   * Valida que las coordenadas geográficas se encuentren en los rangos oficiales del elipsoide WGS84:
   * latitud entre -90 y 90 grados, longitud entre -180 y 180 grados.
   */
  validarCoordenadas(lat: number | null | undefined, lon: number | null | undefined): boolean {
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      return false;
    }
    if (isNaN(lat) || isNaN(lon)) {
      return false;
    }
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }
}
