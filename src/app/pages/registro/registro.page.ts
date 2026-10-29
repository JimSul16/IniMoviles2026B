import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import type { PrioridadIncidencia, TipoIncidencia } from '../../models/incidencia.model';
import { codigoDe, PRIORIDADES, prioridadExigeFoto, TIPOS } from '../../models/incidencia.model';
import type { ErrorCamara } from '../../services/camara.service';
import { CamaraService } from '../../services/camara.service';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';

export interface ErroresFormulario {
  tipo?: string;
  descripcion?: string;
  direccion?: string;
  sector?: string;
  prioridad?: string;
  foto?: string;
}

/**
 * Formulario de Registro de Incidencias Urbanas (R5, 1,6 pts).
 *
 * Valida obligatorios antes de enviar:
 *   - Tipo (luminaria, bache, senalizacion, alcantarilla, parque)
 *   - Descripción (mínimo 5 caracteres)
 *   - Dirección (mínimo 3 caracteres)
 *   - Sector (mínimo 2 caracteres)
 *   - Prioridad (baja, media, alta)
 *   - REGLA CRÍTICA: Prioridad ALTA exige obligatoriamente fotografía de evidencia.
 *     En baja y media la fotografía es opcional.
 *
 * Persiste la nueva incidencia mediante POST a MockAPI con estado 'pendiente'.
 */
@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonSpinner,
  ],
})
export class RegistroPage {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly camaraService = inject(CamaraService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef, { optional: true });

  readonly tipos = TIPOS;
  readonly prioridades = PRIORIDADES;

  // Campos del formulario
  readonly tipo = signal<TipoIncidencia>('luminaria');
  readonly descripcion = signal<string>('');
  readonly direccion = signal<string>('');
  readonly sector = signal<string>('Centro Histórico');
  readonly prioridad = signal<PrioridadIncidencia>('media');
  readonly foto = signal<string>('');
  readonly lat = signal<number | null>(null);
  readonly lon = signal<number | null>(null);

  // Estados de validación y envío
  readonly errores = signal<ErroresFormulario>({});
  readonly enviando = signal<boolean>(false);
  readonly capturandoFoto = signal<boolean>(false);
  readonly errorPermisoCamara = signal<string | null>(null);
  readonly errorServidor = signal<string | null>(null);
  readonly incidenciaCreada = signal<string | null>(null);

  sectoresComunes: string[] = [
    'Centro Histórico',
    'Mariscal Sucre',
    'La Marín',
    'Iñaquito',
    'Calderón',
    'Cumbayá',
    'Quitumbe',
    'Cotocollao',
    'Villa Flora',
    'Chimbacalle',
  ];

  esFotoObligatoria(): boolean {
    return prioridadExigeFoto(this.prioridad());
  }

  validar(): boolean {
    const nuevosErrores: ErroresFormulario = {};

    if (!this.tipo()) {
      nuevosErrores.tipo = 'Debe seleccionar un tipo de incidencia.';
    }

    const desc = this.descripcion().trim();
    if (!desc) {
      nuevosErrores.descripcion = 'La descripción técnica es obligatoria.';
    } else if (desc.length < 5) {
      nuevosErrores.descripcion = 'La descripción debe tener al menos 5 caracteres descriptivos.';
    }

    const dir = this.direccion().trim();
    if (!dir) {
      nuevosErrores.direccion = 'La dirección exacta del daño es obligatoria.';
    } else if (dir.length < 3) {
      nuevosErrores.direccion = 'La dirección debe tener al menos 3 caracteres.';
    }

    const sec = this.sector().trim();
    if (!sec) {
      nuevosErrores.sector = 'El sector o barrio de Quito es obligatorio.';
    }

    if (!this.prioridad()) {
      nuevosErrores.prioridad = 'Debe seleccionar la prioridad de la incidencia.';
    }

    // Regla de oro R5: Prioridad alta exige fotografía
    if (this.esFotoObligatoria() && !this.foto()) {
      nuevosErrores.foto =
        'Para incidencias de prioridad ALTA es obligatorio adjuntar una fotografía de evidencia (R5).';
    }

    this.errores.set(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  guardar(): void {
    if (this.enviando()) {
      return;
    }

    this.errorServidor.set(null);

    if (!this.validar()) {
      return;
    }

    this.enviando.set(true);

    const nuevaIncidencia = {
      tipo: this.tipo(),
      descripcion: this.descripcion().trim(),
      direccion: this.direccion().trim(),
      sector: this.sector().trim(),
      prioridad: this.prioridad(),
      fecha: new Date().toISOString(),
      estado: 'pendiente' as const,
      foto: this.foto() || null,
      lat: this.lat(),
      lon: this.lon(),
      observacion: '',
    };

    const req$ = this.incidenciasService.crearIncidencia(nuevaIncidencia);
    const sub$ = this.destroyRef ? req$.pipe(takeUntilDestroyed(this.destroyRef)) : req$;

    sub$.subscribe({
      next: (creada) => {
        try {
          const codigo = codigoDe(creada);
          this.incidenciaCreada.set(codigo);
          this.limpiarFormulario();
        } finally {
          this.enviando.set(false);
        }
      },
      error: (err: ErrorConsultaIncidencias) => {
        try {
          this.errorServidor.set(
            err.mensaje || 'Error al guardar la incidencia en la oficina municipal. Por favor intente nuevamente.',
          );
        } finally {
          this.enviando.set(false);
        }
      },
    });
  }

  limpiarFormulario(): void {
    this.tipo.set('luminaria');
    this.descripcion.set('');
    this.direccion.set('');
    this.sector.set('Centro Histórico');
    this.prioridad.set('media');
    this.foto.set('');
    this.lat.set(null);
    this.lon.set(null);
    this.errores.set({});
  }

  asignarFoto(fotoData: string): void {
    this.foto.set(fotoData);
    if (this.errores().foto) {
      this.errores.update((errs) => {
        const copia = { ...errs };
        delete copia.foto;
        return copia;
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.asignarFoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Captura una fotografía usando @capacitor/camera (R6).
   * Si el usuario cancela la captura, los demás datos del formulario quedan intactos.
   * Si el permiso es denegado y la prioridad es alta, explica el motivo e impide guardar incompleto.
   */
  async tomarFotoConCamara(): Promise<void> {
    this.errorPermisoCamara.set(null);
    this.capturandoFoto.set(true);

    try {
      const fotoCapturada = await this.camaraService.capturarFoto();
      if (fotoCapturada) {
        this.asignarFoto(fotoCapturada);
      }
      // Si devolvió null (usuario canceló), los datos se mantienen intactos
    } catch (err: unknown) {
      const errCamara = err as ErrorCamara;
      if (errCamara?.tipo === 'permiso_denegado') {
        this.errorPermisoCamara.set(
          'Permiso de cámara denegado. Para reportar una incidencia de prioridad ALTA debe conceder el permiso en los ajustes de su dispositivo.',
        );
      } else {
        this.errorPermisoCamara.set(
          errCamara?.mensaje || 'Ocurrió un error inesperado al intentar acceder a la cámara.',
        );
      }
    } finally {
      this.capturandoFoto.set(false);
    }
  }

  eliminarFoto(): void {
    this.foto.set('');
  }

  irAlListado(): void {
    this.router.navigate(['/incidencias']);
  }
}
