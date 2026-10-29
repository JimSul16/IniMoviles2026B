import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
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
import type { BorradorRegistro } from '../../services/borrador.service';
import { BorradorService } from '../../services/borrador.service';
import type { ErrorCamara } from '../../services/camara.service';
import { CamaraService } from '../../services/camara.service';
import type { ClimaInfo, ErrorClima } from '../../services/clima.service';
import { ClimaService } from '../../services/clima.service';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';
import type { ErrorUbicacion } from '../../services/ubicacion.service';
import { UbicacionService } from '../../services/ubicacion.service';

export interface ErroresFormulario {
  tipo?: string;
  descripcion?: string;
  direccion?: string;
  sector?: string;
  prioridad?: string;
  foto?: string;
  coordenadas?: string;
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
export class RegistroPage implements ViewWillEnter {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly camaraService = inject(CamaraService);
  readonly ubicacionService = inject(UbicacionService);
  readonly climaService = inject(ClimaService);
  private readonly borradorService = inject(BorradorService);
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

  // Estados de validación, envío y borrador (R8)
  readonly errores = signal<ErroresFormulario>({});
  readonly enviando = signal<boolean>(false);
  readonly capturandoFoto = signal<boolean>(false);
  readonly obteniendoGps = signal<boolean>(false);
  readonly borradorPendiente = signal<BorradorRegistro | null>(null);
  readonly errorPermisoCamara = signal<string | null>(null);
  readonly errorGps = signal<string | null>(null);
  readonly errorServidor = signal<string | null>(null);
  readonly incidenciaCreada = signal<string | null>(null);

  // Consulta meteorológica en tiempo real (R4)
  readonly clima = signal<ClimaInfo | null>(null);
  readonly consultandoClima = signal<boolean>(false);
  readonly errorClima = signal<string | null>(null);
  readonly climaConsultado = signal<boolean>(false);

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

  async ionViewWillEnter(): Promise<void> {
    // Si no hay datos en edición y existe un borrador guardado en el dispositivo,
    // se le ofrece al usuario continuar o descartar (R8)
    if (!this.descripcion().trim() && !this.direccion().trim() && !this.foto()) {
      const borrador = await this.borradorService.obtenerBorrador();
      if (borrador) {
        this.borradorPendiente.set(borrador);
      }
    }
  }

  continuarBorrador(): void {
    const b = this.borradorPendiente();
    if (!b) return;

    this.tipo.set(b.tipo);
    this.descripcion.set(b.descripcion);
    this.direccion.set(b.direccion);
    this.sector.set(b.sector);
    this.prioridad.set(b.prioridad);
    this.foto.set(b.foto || '');
    this.lat.set(b.lat ?? null);
    this.lon.set(b.lon ?? null);
    this.borradorPendiente.set(null);
  }

  async descartarBorrador(): Promise<void> {
    await this.borradorService.eliminarBorrador();
    this.borradorPendiente.set(null);
    this.limpiarFormulario();
  }

  guardarBorradorActual(): void {
    this.borradorService.guardarBorrador({
      tipo: this.tipo(),
      descripcion: this.descripcion(),
      direccion: this.direccion(),
      sector: this.sector(),
      prioridad: this.prioridad(),
      foto: this.foto() || null,
      lat: this.lat(),
      lon: this.lon(),
    });
  }

  esFotoObligatoria(): boolean {
    return prioridadExigeFoto(this.prioridad());
  }

  esBache(): boolean {
    return this.tipo() === 'bache';
  }

  /**
   * Obtiene las coordenadas actuales desde el sensor GPS mediante @capacitor/geolocation (R7).
   */
  async obtenerUbicacionActual(): Promise<void> {
    this.errorGps.set(null);
    this.obteniendoGps.set(true);

    try {
      const pos = await this.ubicacionService.obtenerPosicionActual();
      this.lat.set(pos.lat);
      this.lon.set(pos.lon);

      // Limpiar error de coordenadas si estaba presente
      if (this.errores().coordenadas) {
        this.errores.update((errs) => {
          const copia = { ...errs };
          delete copia.coordenadas;
          return copia;
        });
      }

      // Actualizar automáticamente el clima con las nuevas coordenadas GPS
      void this.consultarClimaZona();
    } catch (err: unknown) {
      const errUbi = err as ErrorUbicacion;
      this.errorGps.set(
        errUbi?.mensaje || 'No fue posible obtener la posición GPS. Puede ingresar las coordenadas de forma manual.',
      );
    } finally {
      this.obteniendoGps.set(false);
    }
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

    // Regla de oro R7: En bache la ubicación es obligatoria (GPS o manual válida)
    if (this.esBache()) {
      if (!this.ubicacionService.validarCoordenadas(this.lat(), this.lon())) {
        nuevosErrores.coordenadas =
          'Para incidencias de tipo Bache las coordenadas geográficas son obligatorias (R7). Active el GPS o ingrese valores manuales válidos (latitud entre -90 y 90, longitud entre -180 y 180).';
      }
    } else if (this.lat() !== null || this.lon() !== null) {
      // Si en otro tipo se ingresaron coordenadas parciales, validar que ambas sean correctas
      if (!this.ubicacionService.validarCoordenadas(this.lat(), this.lon())) {
        nuevosErrores.coordenadas =
          'Las coordenadas geográficas ingresadas no son válidas (latitud entre -90 y 90, longitud entre -180 y 180).';
      }
    }

    this.errores.set(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  /**
   * Consulta el clima en tiempo real usando Open-Meteo (R4).
   * Si la consulta falla, captura el error de forma informativa sin bloquear el registro.
   */
  async consultarClimaZona(): Promise<void> {
    this.consultandoClima.set(true);
    this.errorClima.set(null);

    return new Promise<void>((resolve) => {
      this.climaService.consultarClima(this.lat(), this.lon()).subscribe({
        next: (info) => {
          this.clima.set(info);
          this.climaConsultado.set(true);
          this.consultandoClima.set(false);
          resolve();
        },
        error: (err: ErrorClima) => {
          this.errorClima.set(
            err?.mensaje ||
              'No fue posible obtener el reporte meteorológico en tiempo real. Puede continuar con el registro municipal.',
          );
          this.climaConsultado.set(true);
          this.consultandoClima.set(false);
          resolve();
        },
      });
    });
  }

  async guardar(): Promise<void> {
    if (this.enviando()) {
      return;
    }

    this.errorServidor.set(null);

    if (!this.validar()) {
      return;
    }

    // R4: Consulta meteorológica en tiempo real antes de guardar si aún no se consultó
    if (!this.climaConsultado() && !this.clima()) {
      await this.consultarClimaZona();
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
          void this.borradorService.eliminarBorrador();
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
    this.clima.set(null);
    this.errorClima.set(null);
    this.climaConsultado.set(false);
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
