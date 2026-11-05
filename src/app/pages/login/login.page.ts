import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

/**
 * Pantalla de Inicio de Sesión y Registro Institucional (UrbanInspect - DMQ).
 *
 * Integra Firebase Auth con persistencia en @capacitor/preferences y credenciales
 * preconfiguradas para inspectores de campo del Municipio del Distrito Metropolitano de Quito.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class LoginPage {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly modo = signal<'login' | 'registro'>('login');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly displayName = signal<string>('');
  readonly departamento = signal<string>('Dirección Metropolitana de Obras Públicas (EPMMOP)');
  readonly mostrarPassword = signal<boolean>(false);
  readonly errorLocal = signal<string | null>(null);
  readonly exitoRegistro = signal<string | null>(null);

  toggleMostrarPassword(): void {
    this.mostrarPassword.update((val) => !val);
  }

  cambiarModo(nuevoModo: 'login' | 'registro'): void {
    this.modo.set(nuevoModo);
    this.errorLocal.set(null);
    this.exitoRegistro.set(null);
  }

  async onLoginSubmit(): Promise<void> {
    const emailVal = this.email().trim();
    const passVal = this.password();

    if (!emailVal) {
      this.errorLocal.set('Por favor ingrese su correo electrónico institucional.');
      return;
    }
    if (!passVal) {
      this.errorLocal.set('Por favor ingrese su contraseña.');
      return;
    }

    this.errorLocal.set(null);
    try {
      await this.authService.login(emailVal, passVal);
      this.redirigir();
    } catch {
      // El mensaje se publica en authService.error() o lo capturamos
      const errMsg = this.authService.error();
      if (errMsg) {
        this.errorLocal.set(errMsg);
      }
    }
  }

  async onRegistroSubmit(): Promise<void> {
    const emailVal = this.email().trim();
    const passVal = this.password();
    const nombreVal = this.displayName().trim();

    if (!nombreVal) {
      this.errorLocal.set('Ingrese el nombre y apellido del inspector.');
      return;
    }
    if (!emailVal || !emailVal.includes('@')) {
      this.errorLocal.set('Ingrese un correo electrónico válido.');
      return;
    }
    if (passVal.length < 6) {
      this.errorLocal.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.errorLocal.set(null);
    try {
      await this.authService.registro({
        email: emailVal,
        password: passVal,
        displayName: nombreVal,
        departamento: this.departamento(),
      });
      this.exitoRegistro.set('¡Inspector registrado exitosamente! Accediendo al sistema...');
      setTimeout(() => this.redirigir(), 800);
    } catch {
      const errMsg = this.authService.error();
      if (errMsg) {
        this.errorLocal.set(errMsg);
      }
    }
  }

  async accesoRapido(tipo: 'inspector' | 'supervisor'): Promise<void> {
    this.errorLocal.set(null);
    try {
      await this.authService.loginRapido(tipo);
      this.redirigir();
    } catch {
      const errMsg = this.authService.error();
      if (errMsg) {
        this.errorLocal.set(errMsg);
      }
    }
  }

  private redirigir(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    void this.router.navigateByUrl(returnUrl);
  }
}
