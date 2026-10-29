import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, Input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import type {
  EstadoIncidencia,
  Incidencia,
  Opcion,
  PrioridadIncidencia,
  TipoIncidencia,
} from '../../models/incidencia.model';
import { codigoDe, ESTADOS, PRIORIDADES, SIGUIENTE_ESTADO, TIPOS } from '../../models/incidencia.model';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';

/**
 * Detalle de Incidencia y gestión de transiciones de estado (R9, 1,6 pts).
 *
 * Muestra los 8 campos obligatorios: código, tipo, descripción, dirección, sector,
 * fecha, estado, prioridad y fotografía de evidencia si existe.
 *
 * Aplica las reglas estrictas de estado:
 *   - pendiente → en_proceso o resuelta
 *   - en_proceso → resuelta
 *   - resuelta no retrocede (sin opciones de retroceso)
 *   - pasar a 'resuelta' EXIGE una observación técnica obligatoria.
 *   - el cambio se persiste con PATCH a MockAPI.
 */
@Component({
  selector: 'app-detalle',
  templateUrl: './detalle.page.html',
  styleUrls: ['./detalle.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonSpinner,
  ],
})
export class DetallePage implements ViewWillEnter {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef, { optional: true });

  @Input() id = '';

  // Señales de estado de la vista
  readonly estadoVisual = signal<'cargando' | 'exito' | 'error'>('cargando');
  readonly incidencia = signal<Incidencia | null>(null);
  readonly errorInfo = signal<ErrorConsultaIncidencias | null>(null);

  // Señales para transiciones de estado (R9)
  readonly guardando = signal<boolean>(false);
  readonly observacion = signal<string>('');
  readonly errorObservacion = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);
  readonly errorTransicion = signal<string | null>(null);
  readonly fotoRota = signal<boolean>(false);

  private peticionEnVuelo = false;
  private tokenGeneracion = 0;

  ionViewWillEnter(): void {
    // Si id no viene por @Input(), intentar obtenerlo de la ruta activa
    if (!this.id) {
      const idRuta = this.route.snapshot.paramMap.get('id');
      if (idRuta) {
        this.id = idRuta;
      }
    }

    this.cargarDetalle();
  }

  cargarDetalle(): void {
    if (!this.id) {
      this.estadoVisual.set('error');
      this.errorInfo.set({
        tipo: 'no_encontrado',
        status: 404,
        mensaje: 'No se especificó un identificador de incidencia válido.',
      });
      return;
    }

    if (this.peticionEnVuelo) {
      return;
    }

    this.peticionEnVuelo = true;
    this.estadoVisual.set('cargando');
    this.errorInfo.set(null);
    this.mensajeExito.set(null);
    this.errorTransicion.set(null);
    this.fotoRota.set(false);

    const tokenActual = ++this.tokenGeneracion;
    const req$ = this.incidenciasService.getIncidenciaById(this.id);
    const sub$ = this.destroyRef ? req$.pipe(takeUntilDestroyed(this.destroyRef)) : req$;

    sub$.subscribe({
      next: (item) => {
        try {
          if (tokenActual !== this.tokenGeneracion) {
            return;
          }
          this.incidencia.set(item);
          this.observacion.set(item.observacion || '');
          this.estadoVisual.set('exito');
        } finally {
          this.peticionEnVuelo = false;
        }
      },
      error: (err: ErrorConsultaIncidencias) => {
        try {
          if (tokenActual !== this.tokenGeneracion) {
            return;
          }
          this.errorInfo.set(err);
          this.estadoVisual.set('error');
        } finally {
          this.peticionEnVuelo = false;
        }
      },
    });
  }

  /**
   * Transición de estado con reglas de negocio (R9).
   */
  cambiarEstado(nuevoEstado: EstadoIncidencia): void {
    const item = this.incidencia();
    if (!item || this.guardando()) {
      return;
    }

    // Regla estricta: si está resuelta, NO retrocede
    if (item.estado === 'resuelta') {
      this.errorTransicion.set('Una incidencia resuelta no admite cambios ni retrocesos de estado.');
      return;
    }

    // Regla estricta: para pasar a 'resuelta', es obligatoria una observación
    if (nuevoEstado === 'resuelta') {
      const texto = this.observacion().trim();
      if (!texto) {
        this.errorObservacion.set(
          'Para dar por resuelta la incidencia es obligatorio registrar una observación técnica detallada.',
        );
        return;
      }
    }

    this.errorObservacion.set(null);
    this.errorTransicion.set(null);
    this.mensajeExito.set(null);
    this.guardando.set(true);

    const textoObs = this.observacion().trim();

    const req$ = this.incidenciasService.actualizarEstado(item.id, nuevoEstado, textoObs);
    const sub$ = this.destroyRef ? req$.pipe(takeUntilDestroyed(this.destroyRef)) : req$;

    sub$.subscribe({
      next: (actualizada) => {
        try {
          this.incidencia.set(actualizada);
          this.observacion.set(actualizada.observacion || '');
          const labelEstado = this.obtenerEtiquetaEstado(nuevoEstado);
          this.mensajeExito.set(`Incidencia actualizada exitosamente a "${labelEstado}" y guardada en el sistema.`);
        } finally {
          this.guardando.set(false);
        }
      },
      error: (err: ErrorConsultaIncidencias) => {
        try {
          this.errorTransicion.set(err.mensaje || 'Error al persistir el nuevo estado en el servidor municipal.');
        } finally {
          this.guardando.set(false);
        }
      },
    });
  }

  obtenerCodigo(): string {
    const item = this.incidencia();
    return item ? codigoDe(item) : `INC-${this.id}`;
  }

  obtenerTipoInfo(tipo?: TipoIncidencia): Opcion<TipoIncidencia> {
    const encontrado = TIPOS.find((t) => t.valor === tipo);
    return encontrado || { valor: 'luminaria', etiqueta: tipo || 'General', icono: 'bulb-outline' };
  }

  obtenerEstadoInfo(estado?: EstadoIncidencia): Opcion<EstadoIncidencia> {
    const encontrado = ESTADOS.find((e) => e.valor === estado);
    return encontrado || { valor: 'pendiente', etiqueta: estado || 'Pendiente', icono: 'time-outline' };
  }

  obtenerPrioridadInfo(prioridad?: PrioridadIncidencia): Opcion<PrioridadIncidencia> {
    const encontrado = PRIORIDADES.find((p) => p.valor === prioridad);
    return encontrado || { valor: 'baja', etiqueta: prioridad || 'Baja', icono: 'arrow-down-circle-outline' };
  }

  obtenerEtiquetaEstado(estado: EstadoIncidencia): string {
    return this.obtenerEstadoInfo(estado).etiqueta;
  }

  formatearFecha(fechaIso?: string): string {
    if (!fechaIso) return 'Fecha no registrada';
    try {
      const d = new Date(fechaIso);
      if (isNaN(d.getTime())) return fechaIso;
      return d.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaIso;
    }
  }

  siguienteEstadoPermitido(): EstadoIncidencia | null {
    const item = this.incidencia();
    if (!item) return null;
    return SIGUIENTE_ESTADO[item.estado];
  }
}
