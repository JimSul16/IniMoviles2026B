import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import type { EstadoIncidencia, Incidencia, PrioridadIncidencia, TipoIncidencia } from '../../models/incidencia.model';
import { codigoDe, ESTADOS, PRIORIDADES, TIPOS } from '../../models/incidencia.model';
import { IncidenciasService } from '../../services/incidencias.service';
import { SeguimientoService } from '../../services/seguimiento.service';

export type EstadoVistaSeguimiento = 'cargando' | 'vacio' | 'error' | 'exito';

/**
 * Vista Propia de Seguimiento Local Persistente (R1, 0,8 pts).
 *
 * Muestra EXCLUSIVAMENTE las incidencias marcadas por el inspector.
 * Al desmarcar una incidencia, desaparece de esta vista de forma inmediata
 * y reactiva SIN modificar el servicio de oficina remoto (sin DELETE ni PATCH).
 * Los datos se consultan en vivo desde la API para que cualquier cambio de
 * estado en oficina se vea reflejado al abrir la sección.
 */
@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.page.html',
  styleUrls: ['./seguimiento.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonSkeletonText,
  ],
})
export class SeguimientoPage implements ViewWillEnter {
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly router = inject(Router);

  readonly estado = signal<EstadoVistaSeguimiento>('cargando');
  readonly incidencias = signal<Incidencia[]>([]);
  readonly mensajeError = signal<string | null>(null);

  readonly codigoDe = codigoDe;

  async ionViewWillEnter(): Promise<void> {
    await this.cargarSeguimiento();
  }

  /**
   * Carga los identificadores desde Preferences y consulta los datos en vivo.
   */
  async cargarSeguimiento(): Promise<void> {
    this.estado.set('cargando');
    this.mensajeError.set(null);

    const ids = await this.seguimientoService.cargarIds();
    if (!ids || ids.length === 0) {
      this.incidencias.set([]);
      this.estado.set('vacio');
      return;
    }

    try {
      // Consultar en paralelo cada incidencia marcada para obtener sus 8 campos actualizados
      const promesas = ids.map((id) => firstValueFrom(this.incidenciasService.getIncidenciaById(id)));

      const resultados = await Promise.allSettled(promesas);
      const cargadas: Incidencia[] = [];

      for (const res of resultados) {
        if (res.status === 'fulfilled' && res.value) {
          cargadas.push(res.value);
        }
      }

      if (cargadas.length === 0 && ids.length > 0) {
        // Ninguna pudo ser cargada (ej. sin conexión)
        this.mensajeError.set(
          'No fue posible sincronizar las incidencias en seguimiento desde la oficina municipal. Verifique su conexión.',
        );
        this.estado.set('error');
        return;
      }

      this.incidencias.set(cargadas);
      this.estado.set('exito');
    } catch {
      this.mensajeError.set('Ocurrió un error inesperado al recuperar los datos de seguimiento.');
      this.estado.set('error');
    }
  }

  /**
   * Desmarca una incidencia del seguimiento local (R1).
   * La incidencia desaparece de esta vista de inmediato SIN modificar la API de oficina.
   */
  async desmarcar(event: Event, id: string | number): Promise<void> {
    event.stopPropagation();
    const idStr = String(id);
    await this.seguimientoService.desmarcar(idStr);

    // Actualización reactiva local de la lista
    const restantes = this.incidencias().filter((inc) => String(inc.id) !== idStr);
    this.incidencias.set(restantes);

    if (restantes.length === 0) {
      this.estado.set('vacio');
    }
  }

  irADetalle(id: string | number): void {
    this.router.navigate(['/incidencias', id]);
  }

  irAlListado(): void {
    this.router.navigate(['/incidencias']);
  }

  obtenerIconoTipo(tipo: TipoIncidencia): string {
    return TIPOS.find((t) => t.valor === tipo)?.icono || 'help-circle-outline';
  }

  obtenerEtiquetaTipo(tipo: TipoIncidencia): string {
    return TIPOS.find((t) => t.valor === tipo)?.etiqueta || tipo;
  }

  obtenerIconoEstado(estado: EstadoIncidencia): string {
    return ESTADOS.find((e) => e.valor === estado)?.icono || 'help-circle-outline';
  }

  obtenerEtiquetaEstado(estado: EstadoIncidencia): string {
    return ESTADOS.find((e) => e.valor === estado)?.etiqueta || estado;
  }

  obtenerEtiquetaPrioridad(prioridad: PrioridadIncidencia): string {
    return PRIORIDADES.find((p) => p.valor === prioridad)?.etiqueta || prioridad;
  }

  onFotoError(id: string | number): void {
    // Si la foto en base64 o URL falla, oculta la foto defectuosa
    this.incidencias.update((items) => items.map((it) => (String(it.id) === String(id) ? { ...it, foto: null } : it)));
  }
}
