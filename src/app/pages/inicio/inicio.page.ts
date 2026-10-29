import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
import { IonContent, IonHeader, IonIcon, IonSkeletonText, IonTitle, IonToolbar } from '@ionic/angular';

import { IncidenciasService } from '../../services/incidencias.service';

/**
 * Pantalla de inicio con navegación e indicadores reales (R10).
 * Conecta los 3 módulos principales y consulta el conteo de incidencias en MockAPI.
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
  private readonly destroyRef = inject(DestroyRef);

  readonly cargandoIndicador = signal<boolean>(true);
  readonly totalIncidencias = signal<number | null>(null);

  ionViewWillEnter(): void {
    this.cargarIndicador();
  }

  cargarIndicador(): void {
    this.cargandoIndicador.set(true);
    this.incidenciasService
      .getIncidencias(1, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.cargandoIndicador.set(false);
          this.totalIncidencias.set(Array.isArray(data) ? data.length : 0);
        },
        error: () => {
          this.cargandoIndicador.set(false);
          this.totalIncidencias.set(null);
        },
      });
  }
}
