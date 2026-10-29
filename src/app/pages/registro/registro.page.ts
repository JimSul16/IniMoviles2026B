import { Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Marcador de la fase B. Las fases F (R5), G (R6), H (R7), I (R8) y J (R4)
 * la convierten en el formulario de registro con validaciones, cámara,
 * ubicación, borrador recuperable y consulta de clima previa al guardado.
 */
@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonIcon],
})
export class RegistroPage {}
