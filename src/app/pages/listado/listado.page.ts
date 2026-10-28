import { Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Marcador de la fase B. La fase C (R2) y D (R3) la convierten en el listado
 * con paginación remota, estados vacío/error y los 8 campos.
 */
@Component({
  selector: 'app-listado',
  templateUrl: './listado.page.html',
  styleUrls: ['./listado.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
})
export class ListadoPage {}
