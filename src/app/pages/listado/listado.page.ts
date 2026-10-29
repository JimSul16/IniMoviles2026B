import { UpperCasePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import type { EstadoIncidencia, Incidencia, TipoIncidencia } from '../../models/incidencia.model';
import { codigoDe, ESTADOS, TIPOS } from '../../models/incidencia.model';
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
    UpperCasePipe,
  ],
})
export class ListadoPage implements OnInit {
  private readonly incidenciasService = inject(IncidenciasService);

  readonly estadoVisual = signal<'cargando' | 'vacio' | 'error' | 'exito'>('cargando');
  readonly incidencias = signal<Incidencia[]>([]);
  readonly errorInfo = signal<ErrorConsultaIncidencias | null>(null);

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  /**
   * Carga la primera página de incidencias desde MockAPI.
   */
  cargarIncidencias(): void {
    this.estadoVisual.set('cargando');
    this.errorInfo.set(null);

    this.incidenciasService.getIncidencias(1, environment.pageSize).subscribe({
      next: (data) => {
        const registros = data ?? [];
        this.incidencias.set(registros);
        if (registros.length === 0) {
          this.estadoVisual.set('vacio');
        } else {
          this.estadoVisual.set('exito');
        }
      },
      error: (err: ErrorConsultaIncidencias) => {
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
