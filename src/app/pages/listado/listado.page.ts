import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { environment } from '../../../environments/environment';
import type { EstadoIncidencia, Incidencia, PrioridadIncidencia, TipoIncidencia } from '../../models/incidencia.model';
import { codigoDe, ESTADOS, PRIORIDADES, TIPOS } from '../../models/incidencia.model';
import { CloudinaryService } from '../../services/cloudinary.service';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';
import { SeguimientoService } from '../../services/seguimiento.service';

/**
 * Vista de consulta de incidencias con paginación remota incremental (R2 + R3)
 * y herramientas avanzadas de organización en campo (búsqueda en vivo, filtrado y optimización CDN).
 */
@Component({
  selector: 'app-listado',
  templateUrl: './listado.page.html',
  styleUrls: ['./listado.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    RouterLink,
  ],
})
export class ListadoPage implements ViewWillEnter {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly estadoVisual = signal<'cargando' | 'vacio' | 'error' | 'exito'>('cargando');
  readonly incidencias = signal<Incidencia[]>([]);
  readonly errorInfo = signal<ErrorConsultaIncidencias | null>(null);

  /** Filtros y búsqueda interactiva en campo */
  readonly terminoBusqueda = signal<string>('');
  readonly filtroTipo = signal<string>('todos');
  readonly filtroEstado = signal<string>('todos');
  readonly filtroPrioridad = signal<string>('todos');

  readonly tipos = TIPOS;
  readonly estados = ESTADOS;
  readonly prioridades = PRIORIDADES;

  /** Lista reactiva filtrada en memoria sobre el buffer cargado */
  readonly incidenciasFiltradas = computed(() => {
    let items = this.incidencias();
    const termino = this.terminoBusqueda().trim().toLowerCase();
    const tipo = this.filtroTipo();
    const estado = this.filtroEstado();
    const prioridad = this.filtroPrioridad();

    if (termino) {
      items = items.filter(
        (i) =>
          codigoDe(i).toLowerCase().includes(termino) ||
          i.descripcion.toLowerCase().includes(termino) ||
          i.direccion.toLowerCase().includes(termino) ||
          i.sector.toLowerCase().includes(termino),
      );
    }

    if (tipo !== 'todos') {
      items = items.filter((i) => i.tipo === tipo);
    }

    if (estado !== 'todos') {
      items = items.filter((i) => i.estado === estado);
    }

    if (prioridad !== 'todos') {
      items = items.filter((i) => i.prioridad === prioridad);
    }

    return items;
  });

  /** Paginación remota (R3) */
  readonly paginaActual = signal<number>(1);
  readonly hasMore = signal<boolean>(true);
  readonly cargandoMas = signal<boolean>(false);
  readonly errorCargaMas = signal<string | null>(null);

  /** Conjunto de IDs para deduplicación estricta y prevención de NG0955 */
  private readonly idsCargados = new Set<string>();

  /** Evita múltiples peticiones simultáneas */
  private peticionEnVuelo = false;
  /** Token de generación para descartar respuestas viejas */
  private tokenGeneracion = 0;

  /**
   * Se ejecuta cada vez que la vista entra en pantalla (IonRouterOutlet),
   * garantizando que los datos se refresquen tras un registro o actualización (R10).
   */
  ionViewWillEnter(): void {
    const estadoParam = this.route.snapshot.queryParamMap.get('estado');
    if (estadoParam && ['pendiente', 'en_proceso', 'resuelta'].includes(estadoParam)) {
      this.filtroEstado.set(estadoParam);
    }

    if (this.incidencias().length === 0 || this.incidenciasService.consumirNuevaIncidencia?.()) {
      this.cargarIncidencias();
    }
  }

  /**
   * Manejador de pull-to-refresh para recargar la lista de campo.
   */
  async refrescar(event: CustomEvent): Promise<void> {
    this.cargarIncidencias(true);
    // Esperar a que concluya la recarga
    setTimeout(() => {
      (event.target as HTMLIonRefresherElement)?.complete();
    }, 600);
  }

  limpiarFiltros(): void {
    this.terminoBusqueda.set('');
    this.filtroTipo.set('todos');
    this.filtroEstado.set('todos');
    this.filtroPrioridad.set('todos');
  }

  esUrlCloudinary(url: string | null | undefined): boolean {
    return this.cloudinaryService.esUrlCloudinary(url);
  }

  obtenerFotoOptimizada(url: string | null | undefined): string {
    return this.cloudinaryService.obtenerUrlOptimizada(url, { width: 440, height: 280 });
  }

  /**
   * Carga la primera página de incidencias desde MockAPI reseteando la paginación.
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
    this.errorCargaMas.set(null);

    // Reinicio de paginación
    this.paginaActual.set(1);
    this.hasMore.set(true);
    this.idsCargados.clear();

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
          const unicos: Incidencia[] = [];

          for (const item of registros) {
            const idStr = String(item.id);
            if (!this.idsCargados.has(idStr)) {
              this.idsCargados.add(idStr);
              unicos.push(item);
            }
          }

          this.incidencias.set(unicos);

          // Si la primera página viene vacía o corta
          if (registros.length === 0) {
            this.estadoVisual.set('vacio');
            this.hasMore.set(false);
          } else {
            this.estadoVisual.set('exito');
            this.hasMore.set(registros.length === environment.pageSize);
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

  /**
   * Carga la siguiente página incremental desde MockAPI y concatena a la lista existente (R3).
   */
  cargarMas(event?: { target: HTMLIonInfiniteScrollElement }): void {
    // Si no hay más registros o hay una petición en curso, cerramos el evento de inmediato
    if (!this.hasMore() || this.peticionEnVuelo || this.cargandoMas()) {
      event?.target?.complete();
      return;
    }

    this.cargandoMas.set(true);
    this.errorCargaMas.set(null);
    const siguientePagina = this.paginaActual() + 1;
    const tokenActual = ++this.tokenGeneracion;

    this.incidenciasService
      .getIncidencias(siguientePagina, environment.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          try {
            if (tokenActual !== this.tokenGeneracion) {
              return;
            }
            const registros = Array.isArray(data) ? data : [];
            const nuevos: Incidencia[] = [];

            for (const item of registros) {
              const idStr = String(item.id);
              if (!this.idsCargados.has(idStr)) {
                this.idsCargados.add(idStr);
                nuevos.push(item);
              }
            }

            if (nuevos.length > 0) {
              this.incidencias.update((prev) => [...prev, ...nuevos]);
            }

            this.paginaActual.set(siguientePagina);

            // Fin real de datos cuando una página viene con menos elementos que el tamaño de página
            if (registros.length < environment.pageSize) {
              this.hasMore.set(false);
            }
          } finally {
            this.cargandoMas.set(false);
            event?.target?.complete();
          }
        },
        error: (err: ErrorConsultaIncidencias) => {
          try {
            if (tokenActual !== this.tokenGeneracion) {
              return;
            }
            this.errorCargaMas.set(err.mensaje || 'Error al cargar más incidencias.');
          } finally {
            this.cargandoMas.set(false);
            event?.target?.complete();
          }
        },
      });
  }

  codigoDe(incidencia: Pick<Incidencia, 'id'>): string {
    return codigoDe(incidencia);
  }

  obtenerEtiquetaTipo(tipo: TipoIncidencia): string {
    return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
  }

  estaEnSeguimiento(id: string | number): boolean {
    return this.seguimientoService.estaEnSeguimiento(id);
  }

  async toggleSeguimiento(event: Event, id: string | number): Promise<void> {
    event.stopPropagation();
    await this.seguimientoService.alternarSeguimiento(id);
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
