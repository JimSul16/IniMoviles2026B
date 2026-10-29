import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import type { PrioridadIncidencia, TipoIncidencia } from '../models/incidencia.model';

export interface BorradorRegistro {
  tipo: TipoIncidencia;
  descripcion: string;
  direccion: string;
  sector: string;
  prioridad: PrioridadIncidencia;
  foto?: string | null;
  lat?: number | null;
  lon?: number | null;
  fechaGuardado: string;
}

const CLAVE_BORRADOR = 'urbaninspect_borrador_registro';

/**
 * Servicio de Persistencia de Borrador Local (R8, 1,2 pts).
 *
 * Utiliza @capacitor/preferences para resguardar los datos del formulario
 * en el almacenamiento seguro del dispositivo ante cierre inesperado o
 * navegación fuera de la pantalla.
 */
@Injectable({
  providedIn: 'root',
})
export class BorradorService {
  /**
   * Guarda el estado actual del formulario como borrador local.
   */
  async guardarBorrador(datos: Omit<BorradorRegistro, 'fechaGuardado'>): Promise<void> {
    try {
      const borrador: BorradorRegistro = {
        ...datos,
        fechaGuardado: new Date().toISOString(),
      };
      await Preferences.set({
        key: CLAVE_BORRADOR,
        value: JSON.stringify(borrador),
      });
    } catch {
      // Ignorar fallos de I/O silenciosamente para no interrumpir al usuario
    }
  }

  /**
   * Obtiene el borrador almacenado si existe y contiene información sustancial.
   */
  async obtenerBorrador(): Promise<BorradorRegistro | null> {
    try {
      const { value } = await Preferences.get({ key: CLAVE_BORRADOR });
      if (!value) {
        return null;
      }

      const borrador = JSON.parse(value) as BorradorRegistro;
      if (this.esBorradorSustancial(borrador)) {
        return borrador;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Elimina el borrador local (por ejemplo tras enviar exitosamente o descartar).
   */
  async eliminarBorrador(): Promise<void> {
    try {
      await Preferences.remove({ key: CLAVE_BORRADOR });
    } catch {
      // Fallback
    }
  }

  /**
   * Determina si el borrador tiene contenido significativo ingresado por el inspector.
   */
  esBorradorSustancial(b: BorradorRegistro | null | undefined): boolean {
    if (!b) return false;
    return Boolean(
      b.descripcion?.trim() ||
      b.direccion?.trim() ||
      b.foto ||
      b.lat != null ||
      b.lon != null ||
      (b.sector && b.sector !== 'Centro Histórico'),
    );
  }
}
