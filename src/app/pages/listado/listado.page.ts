import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
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

import { environment } from '../../../environments/environment';
import type { EstadoIncidencia, Incidencia, PrioridadIncidencia, TipoIncidencia } from '../../models/incidencia.model';
import { codigoDe, ESTADOS, PRIORIDADES, TIPOS } from '../../models/incidencia.model';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';

/**
 * Vista de consulta de incidencias (R2).
 * Muestra los 8 campos obligatorios por registro y maneja los 3 estados:
 * - Carga (esqueletos con formato real)
 * - Vacío (mensaje informativo sin error)
 * - Error con reintento (distingue caída de red de 404 o fallo de servidor)
 */
@Component({
  selector: 'app-listado',
  templateUrl: './listado.page.html',
  styleUrls: ['./listado.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSkeletonText,
    RouterLink,
  ],
})
export class ListadoPage implements ViewWillEnter {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly destroyRef = inject(DestroyRef);

  readonly estadoVisual = signal<'cargando' | 'vacio' | 'error' | 'exito'>('cargando');
  readonly incidencias = signal<Incidencia[]>([]);
  readonly errorInfo = signal<ErrorConsultaIncidencias | null>(null);

  /** Evita múltiples peticiones simultáneas */
  private peticionEnVuelo = false;
  /** Token de generación para descartar respuestas viejas */
  private tokenGeneracion = 0;

  /**
   * Se ejecuta cada vez que la vista entra en pantalla (IonRouterOutlet),
   * garantizando que los datos se refresquen tras un registro o actualización (R10).
   */
  ionViewWillEnter(): void {
    this.cargarIncidencias();
  }

  /**
   * Carga la primera página de incidencias desde MockAPI.
   * @param forzarEsqueleto Si es true, muestra los skeletons aunque ya existan datos.
   */
  cargarIncidencias(forzarEsqueleto = false): void {
    if (this.peticionEnVuelo) {
      return;
    }
    this.peticionEnVuelo = true;

    // Solo mostramos el skeleton si la lista está vacía o se fuerza explícitamente
    if (this.incidencias().length === 0 || forzarEsqueleto) {
      this.estadoVisual.set('cargando');
    }
    this.errorInfo.set(null);

    const tokenActual = ++this.tokenGeneracion;

    this.incidenciasService
      .getIncidencias(1, environment.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.peticionEnVuelo = false;
          if (tokenActual !== this.tokenGeneracion) {
            return;
          }
          const registros = Array.isArray(data) ? data : [];
          this.incidencias.set(registros);
          if (registros.length === 0) {
            this.estadoVisual.set('vacio');
          } else {
            this.estadoVisual.set('exito');
          }
        },
        error: (err: ErrorConsultaIncidencias) => {
          this.peticionEnVuelo = false;
          if (tokenActual !== this.tokenGeneracion) {
            return;
          }
          this.errorInfo.set(err);
          this.estadoVisual.set('error');
        },
      });
  }

  codigoDe(incidencia: Pick<Incidencia, 'id'>): string {
    return codigoDe(incidencia);
  }

  obtenerEtiquetaTipo(tipo: TipoIncidencia): string {
    return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
  }

  obtenerIconoTipo(tipo: TipoIncidencia): string {
    return TIPOS.find((t) => t.valor === tipo)?.icono ?? 'help-circle-outline';
  }

  obtenerEtiquetaEstado(estado: EstadoIncidencia): string {
    return ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado;
  }

  obtenerIconoEstado(estado: EstadoIncidencia): string {
    return ESTADOS.find((e) => e.valor === estado)?.icono ?? 'time-outline';
  }

  obtenerEtiquetaPrioridad(prioridad: PrioridadIncidencia): string {
    return PRIORIDADES.find((p) => p.valor === prioridad)?.etiqueta ?? prioridad;
  }

  /**
   * Manejador para cuando una imagen falla al cargar (ej. URL rota o formato inválido):
   * actualiza la propiedad foto a null de forma inmutable para desplegar el fallback visual.
   */
  onFotoError(id: string | number): void {
    this.incidencias.update((items) => items.map((item) => (item.id === id ? { ...item, foto: null } : item)));
  }

  formatearFecha(fechaIso: string): string {
    if (!fechaIso) return 'Fecha no registrada';
    const d = new Date(fechaIso);
    if (isNaN(d.getTime())) return fechaIso;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} · ${hora}:${min}`;
  }
}
