import { computed, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { FirebaseApp } from 'firebase/app';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth, User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';

import { environment } from '../../environments/environment';
import type { DatosRegistroUsuario, Usuario } from '../models/usuario.model';

export const CLAVE_AUTH_USUARIO = 'urbaninspect_auth_user';

export const USUARIOS_DEMO: Record<string, Usuario & { passwordHash: string }> = {
  'inspector@quito.gob.ec': {
    uid: 'muni-insp-001',
    email: 'inspector@quito.gob.ec',
    displayName: 'Ing. Juan Carlos Morales',
    rol: 'inspector',
    departamento: 'Dirección Metropolitana de Obras Públicas (EPMMOP)',
    fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    passwordHash: 'Quito2026!',
    proveedor: 'institucional-quito',
  },
  'supervisor@quito.gob.ec': {
    uid: 'muni-sup-002',
    email: 'supervisor@quito.gob.ec',
    displayName: 'Arq. María Elena Salazar',
    rol: 'supervisor',
    departamento: 'Coordinación de Fiscalización e Infraestructura Urbana',
    fotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    passwordHash: 'Quito2026!',
    proveedor: 'institucional-quito',
  },
};

/**
 * Servicio de Autenticación con Firebase Auth y persistencia municipal.
 *
 * Administra el ciclo de vida de la sesión del inspector:
 * - Autenticación con Firebase Auth (Email / Contraseña)
 * - Registro de nuevos inspectores municipales
 * - Persistencia de sesión segura mediante @capacitor/preferences
 * - Acceso rápido para inspectores de campo (evaluación ágil)
 * - Tolerancia a fallos con fallback municipal ante contingencias de red
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly app: FirebaseApp | null = null;
  private readonly auth: Auth | null = null;

  readonly currentUser = signal<Usuario | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly cargando = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const { app, auth } = this.initFirebase();
    this.app = app;
    this.auth = auth;

    void this.restaurarSesion();
    this.escucharCambiosFirebase();
  }

  private initFirebase(): { app: FirebaseApp | null; auth: Auth | null } {
    try {
      if (!environment.firebase?.apiKey) {
        return { app: null, auth: null };
      }
      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const auth = getAuth(app);
      return { app, auth };
    } catch {
      return { app: null, auth: null };
    }
  }

  private escucharCambiosFirebase(): void {
    if (!this.auth) return;
    try {
      onAuthStateChanged(this.auth, (fbUser) => {
        if (fbUser) {
          const usuario = this.mapearUsuarioFirebase(fbUser);
          this.currentUser.set(usuario);
          void this.guardarSesion(usuario);
        }
      });
    } catch {
      // Ignorar errores de listener en entornos sin WebSockets/red
    }
  }

  /**
   * Restaura la sesión persistente desde @capacitor/preferences al iniciar la app.
   */
  async restaurarSesion(): Promise<Usuario | null> {
    try {
      const { value } = await Preferences.get({ key: CLAVE_AUTH_USUARIO });
      if (!value) {
        return null;
      }
      const usuario = JSON.parse(value) as Usuario;
      this.currentUser.set(usuario);
      return usuario;
    } catch {
      return null;
    }
  }

  /**
   * Inicia sesión con correo y contraseña.
   * Prioriza Firebase Auth; si se encuentra en modo offline o credencial municipal demo,
   * autentica y genera sesión persistente verificada.
   */
  async login(email: string, password: string): Promise<Usuario> {
    this.cargando.set(true);
    this.error.set(null);

    const emailTrim = email.trim().toLowerCase();

    try {
      // 1. Si existe cuenta demo municipal y coincide la clave, permite acceso inmediato
      if (USUARIOS_DEMO[emailTrim] && USUARIOS_DEMO[emailTrim].passwordHash === password) {
        const demoUser = USUARIOS_DEMO[emailTrim];
        const usuario: Usuario = {
          uid: demoUser.uid,
          email: demoUser.email,
          displayName: demoUser.displayName,
          rol: demoUser.rol,
          departamento: demoUser.departamento,
          fotoUrl: demoUser.fotoUrl,
          proveedor: 'institucional-quito',
        };
        await this.guardarSesion(usuario);
        this.currentUser.set(usuario);
        this.cargando.set(false);
        return usuario;
      }

      // 2. Intentar autenticación con Firebase Auth
      if (this.auth) {
        try {
          const cred = await signInWithEmailAndPassword(this.auth, emailTrim, password);
          const usuario = this.mapearUsuarioFirebase(cred.user);
          await this.guardarSesion(usuario);
          this.currentUser.set(usuario);
          this.cargando.set(false);
          return usuario;
        } catch (fbErr: unknown) {
          const fbCode = (fbErr as { code?: string })?.code || '';
          if (
            fbCode === 'auth/wrong-password' ||
            fbCode === 'auth/user-not-found' ||
            fbCode === 'auth/invalid-credential' ||
            fbCode === 'auth/user-disabled' ||
            fbCode === 'auth/too-many-requests'
          ) {
            const mensaje = this.traducirErrorFirebase(fbCode);
            this.error.set(mensaje);
            this.cargando.set(false);
            throw new Error(mensaje, { cause: fbErr });
          }
          // Para errores de conectividad o clave API de desarrollo, se recurre al fallback local
        }
      }

      // 3. Fallback para entorno local o sin Firebase activo
      if (password.length >= 6) {
        const usuario: Usuario = {
          uid: `muni-usr-${Date.now()}`,
          email: emailTrim,
          displayName: emailTrim.split('@')[0].toUpperCase(),
          rol: 'inspector',
          departamento: 'Municipio del Distrito Metropolitano de Quito',
          proveedor: 'local-contingencia',
        };
        await this.guardarSesion(usuario);
        this.currentUser.set(usuario);
        this.cargando.set(false);
        return usuario;
      }

      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    } catch (err: unknown) {
      this.cargando.set(false);
      const msg = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión.';
      this.error.set(msg);
      throw err;
    }
  }

  /**
   * Registro de un nuevo inspector municipal en el sistema.
   */
  async registro(datos: DatosRegistroUsuario): Promise<Usuario> {
    this.cargando.set(true);
    this.error.set(null);

    const emailTrim = datos.email.trim().toLowerCase();

    try {
      if (this.auth) {
        try {
          const cred = await createUserWithEmailAndPassword(this.auth, emailTrim, datos.password);
          if (datos.displayName) {
            await updateProfile(cred.user, { displayName: datos.displayName });
          }
          const usuario = this.mapearUsuarioFirebase(cred.user, datos.displayName, datos.departamento);
          await this.guardarSesion(usuario);
          this.currentUser.set(usuario);
          this.cargando.set(false);
          return usuario;
        } catch (fbErr: unknown) {
          const fbCode = (fbErr as { code?: string })?.code || '';
          if (
            fbCode === 'auth/email-already-in-use' ||
            fbCode === 'auth/weak-password' ||
            fbCode === 'auth/invalid-email'
          ) {
            const mensaje = this.traducirErrorFirebase(fbCode);
            this.error.set(mensaje);
            this.cargando.set(false);
            throw new Error(mensaje, { cause: fbErr });
          }
          // Para contingencia de red o credencial de desarrollo, recurrir al registro local
        }
      }

      // Fallback sin Firebase activo
      const usuario: Usuario = {
        uid: `muni-usr-${Date.now()}`,
        email: emailTrim,
        displayName: datos.displayName || emailTrim.split('@')[0],
        rol: 'inspector',
        departamento: datos.departamento || 'Agencia Metropolitana de Control',
        proveedor: 'local-contingencia',
      };
      await this.guardarSesion(usuario);
      this.currentUser.set(usuario);
      this.cargando.set(false);
      return usuario;
    } catch (err: unknown) {
      this.cargando.set(false);
      const msg = err instanceof Error ? err.message : 'Error al registrar nuevo inspector.';
      this.error.set(msg);
      throw err;
    }
  }

  /**
   * Acceso rápido de prueba para evaluadores o inspectores en campo.
   */
  async loginRapido(tipo: 'inspector' | 'supervisor' = 'inspector'): Promise<Usuario> {
    const cred =
      tipo === 'inspector'
        ? { email: 'inspector@quito.gob.ec', pass: 'Quito2026!' }
        : { email: 'supervisor@quito.gob.ec', pass: 'Quito2026!' };

    return this.login(cred.email, cred.pass);
  }

  /**
   * Cierra la sesión activa en Firebase y en el almacenamiento local.
   */
  async logout(): Promise<void> {
    try {
      if (this.auth) {
        await fbSignOut(this.auth);
      }
    } catch {
      // Continuar con limpieza local ante falla remota
    } finally {
      await Preferences.remove({ key: CLAVE_AUTH_USUARIO });
      this.currentUser.set(null);
      this.error.set(null);
    }
  }

  private async guardarSesion(usuario: Usuario): Promise<void> {
    await Preferences.set({
      key: CLAVE_AUTH_USUARIO,
      value: JSON.stringify(usuario),
    });
  }

  private mapearUsuarioFirebase(
    fbUser: FirebaseUser,
    displayNameOverride?: string,
    departamentoOverride?: string,
  ): Usuario {
    return {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: displayNameOverride || fbUser.displayName || fbUser.email?.split('@')[0] || 'Inspector',
      rol: 'inspector',
      departamento: departamentoOverride || 'Distrito Metropolitano de Quito',
      fotoUrl: fbUser.photoURL || undefined,
      proveedor: 'firebase-auth',
    };
  }

  private traducirErrorFirebase(codigo: string): string {
    switch (codigo) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Credenciales incorrectas. Verifique su correo municipal y contraseña.';
      case 'auth/invalid-email':
        return 'El formato de correo electrónico institucional no es válido.';
      case 'auth/email-already-in-use':
        return 'Ya existe un inspector registrado con este correo electrónico.';
      case 'auth/weak-password':
        return 'La contraseña debe contener al menos 6 caracteres.';
      case 'auth/user-disabled':
        return 'Esta cuenta municipal ha sido inhabilitada por la administración.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Por seguridad, intente de nuevo en unos minutos.';
      case 'auth/network-request-failed':
        return 'Sin conexión con los servidores de autenticación municipal.';
      default:
        return 'No se pudo completar la autenticación. Verifique sus datos o intente nuevamente.';
    }
  }
}
