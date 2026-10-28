import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Marcador de la fase B. La fase L (R10) la convierte en el inicio con indicadores.
 */
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class InicioPage {}
