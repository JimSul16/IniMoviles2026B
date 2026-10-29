import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export const CLAVE_SEGUIMIENTO = 'urbaninspect_seguimiento_ids';

/**
 * Servicio de Seguimiento Local Persistente (R1, 0,8 pts).
 *
 * Permite marcar y desmarcar incidencias para su supervisión prioritaria.
 * La persistencia se realiza exclusivamente mediante @capacitor/preferences
 * almacenando ÚNICAMENTE los identificadores (ids) de las incidencias,
 * garantizando que los datos visualizados siempre reflejen el estado real
 * de la oficina sin alterar la API remota ni guardar información obsoleta.
 */
@Injectable({
  providedIn: 'root',
})
export class SeguimientoService {
  /**
   * Set reactivo de identificadores en seguimiento para sincronización inmediata
   * en todas las vistas de la aplicación.
   */
  readonly idsSeguimiento = signal<Set<string>>(new Set<string>());

  constructor() {
    void this.cargarIds();
  }

  /**
   * Lee la lista de códigos marcados desde el almacenamiento local persistente.
   */
  async cargarIds(): Promise<string[]> {
    try {
      const { value } = await Preferences.get({ key: CLAVE_SEGUIMIENTO });
      if (!value) {
        this.idsSeguimiento.set(new Set<string>());
        return [];
      }

      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const ids = parsed.map((id) => String(id));
        this.idsSeguimiento.set(new Set<string>(ids));
        return ids;
      }
      return [];
    } catch {
      this.idsSeguimiento.set(new Set<string>());
      return [];
    }
  }

  /**
   * Verifica si un identificador se encuentra actualmente en seguimiento.
   */
  estaEnSeguimiento(id: string | number): boolean {
    return this.idsSeguimiento().has(String(id));
  }

  /**
   * Alterna el estado de seguimiento para una incidencia (marcar o desmarcar).
   * Persiste la lista de IDs actualizada en Preferences sin llamar a la API municipal.
   */
  async alternarSeguimiento(id: string | number): Promise<boolean> {
    const idStr = String(id);
    const actual = new Set(this.idsSeguimiento());
    const nuevoEstado = !actual.has(idStr);

    if (nuevoEstado) {
      actual.add(idStr);
    } else {
      actual.delete(idStr);
    }

    this.idsSeguimiento.set(actual);
    await this.guardarEnAlmacenamiento(actual);
    return nuevoEstado;
  }

  /**
   * Desmarca un identificador del seguimiento local persistente.
   */
  async desmarcar(id: string | number): Promise<void> {
    const idStr = String(id);
    const actual = new Set(this.idsSeguimiento());
    if (actual.has(idStr)) {
      actual.delete(idStr);
      this.idsSeguimiento.set(actual);
      await this.guardarEnAlmacenamiento(actual);
    }
  }

  /**
   * Elimina todos los registros de seguimiento local.
   */
  async limpiarTodos(): Promise<void> {
    this.idsSeguimiento.set(new Set<string>());
    await Preferences.remove({ key: CLAVE_SEGUIMIENTO });
  }

  private async guardarEnAlmacenamiento(ids: Set<string>): Promise<void> {
    try {
      const arrayIds = Array.from(ids);
      await Preferences.set({
        key: CLAVE_SEGUIMIENTO,
        value: JSON.stringify(arrayIds),
      });
    } catch {
      // Manejo silencioso de fallo de Preferences
    }
  }
}
