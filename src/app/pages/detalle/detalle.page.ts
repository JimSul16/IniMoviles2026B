import { Component, Input } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { codigoDe } from '../../models/incidencia.model';

/**
 * Marcador de la fase B. La fase E (R9) la convierte en el detalle de una
 * incidencia con sus 8 campos, la foto, el mapa y las transiciones de estado.
 *
 * La ruta es `incidencia/:id` y `withComponentInputBinding()` (app.config.ts)
 * entrega el `id` directamente a la propiedad `@Input() id`.
 */
@Component({
  selector: 'app-detalle',
  templateUrl: './detalle.page.html',
  styleUrls: ['./detalle.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
})
export class DetallePage {
  @Input() id = '';

  get codigo(): string {
    return codigoDe({ id: this.id });
  }
}
