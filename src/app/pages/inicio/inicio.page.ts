import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
import { IonContent, IonHeader, IonIcon, IonSkeletonText, IonTitle, IonToolbar } from '@ionic/angular';

import { IncidenciasService } from '../../services/incidencias.service';
import { SeguimientoService } from '../../services/seguimiento.service';

/**
 * Pantalla de inicio con navegación e indicadores reales de inspección (R10, 0,8 pts).
 *
 * Conecta los 3 módulos principales y consulta los estados en tiempo real:
 *   - Total de incidencias registradas en sistema
 *   - Desglose por estados (Pendientes, En proceso, Resueltas)
 *   - Conteo de incidencias marcadas para seguimiento local
 * Refresca los indicadores cada vez que el inspector entra a la pantalla (ionViewWillEnter).
 */
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSkeletonText, RouterLink],
})
export class InicioPage implements ViewWillEnter {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargandoIndicador = signal<boolean>(true);
  readonly totalIncidencias = signal<number | null>(null);
  readonly pendientes = signal<number>(0);
  readonly enProceso = signal<number>(0);
  readonly resueltas = signal<number>(0);
  readonly enSeguimiento = signal<number>(0);

  ionViewWillEnter(): void {
    this.cargarIndicadores();
  }

  cargarIndicadores(): void {
    this.cargandoIndicador.set(true);

    // Conteo en seguimiento local persistente (R1)
    void this.seguimientoService.cargarIds().then((ids) => {
      this.enSeguimiento.set(ids.length);
    });

    // Conteo y desglose de estados desde la API de oficina (R2 + R10)
    this.incidenciasService
      .getIncidencias(1, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.cargandoIndicador.set(false);
          if (Array.isArray(data)) {
            this.totalIncidencias.set(data.length);
            this.pendientes.set(data.filter((i) => i.estado === 'pendiente').length);
            this.enProceso.set(data.filter((i) => i.estado === 'en_proceso').length);
            this.resueltas.set(data.filter((i) => i.estado === 'resuelta').length);
          } else {
            this.totalIncidencias.set(0);
          }
        },
        error: () => {
          this.cargandoIndicador.set(false);
          this.totalIncidencias.set(null);
        },
      });
  }
}
