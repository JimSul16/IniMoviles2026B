import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import type { Incidencia } from '../../models/incidencia.model';
import { BorradorService } from '../../services/borrador.service';
import { CamaraService } from '../../services/camara.service';
import { ClimaService } from '../../services/clima.service';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';
import { UbicacionService } from '../../services/ubicacion.service';

import { RegistroPage } from './registro.page';

describe('RegistroPage (R5 + R6 + R7 + R8 + R4)', () => {
  let component: RegistroPage;
  let fixture: ComponentFixture<RegistroPage>;
  let mockIncidenciasService: {
    crearIncidencia: ReturnType<typeof vi.fn>;
  };
  let mockCamaraService: {
    capturarFoto: ReturnType<typeof vi.fn>;
    asegurarLimiteTamanio: ReturnType<typeof vi.fn>;
  };
  let mockUbicacionService: {
    obtenerPosicionActual: ReturnType<typeof vi.fn>;
    validarCoordenadas: (lat: number | null | undefined, lon: number | null | undefined) => boolean;
  };
  let mockBorradorService: {
    obtenerBorrador: ReturnType<typeof vi.fn>;
    guardarBorrador: ReturnType<typeof vi.fn>;
    eliminarBorrador: ReturnType<typeof vi.fn>;
  };
  let mockClimaService: {
    consultarClima: ReturnType<typeof vi.fn>;
  };

  const nuevaRespuesta: Incidencia = {
    id: '27',
    tipo: 'bache',
    descripcion: 'Bache profundo en el carril central',
    direccion: 'Av. Amazonas y Eloy Alfaro',
    sector: 'Iñaquito',
    fecha: '2026-10-28T12:00:00',
    estado: 'pendiente',
    prioridad: 'alta',
    foto: 'data:image/jpeg;base64,samplephoto',
    lat: -0.18,
    lon: -78.48,
    observacion: '',
  };

  beforeEach(async () => {
    mockIncidenciasService = {
      crearIncidencia: vi.fn(),
    };
    mockCamaraService = {
      capturarFoto: vi.fn(),
      asegurarLimiteTamanio: vi.fn().mockImplementation(async (f: string) => f),
    };
    mockUbicacionService = {
      obtenerPosicionActual: vi.fn(),
      validarCoordenadas: (lat, lon) => {
        if (lat === null || lat === undefined || lon === null || lon === undefined) return false;
        if (isNaN(lat) || isNaN(lon)) return false;
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
      },
    };
    mockBorradorService = {
      obtenerBorrador: vi.fn().mockResolvedValue(null),
      guardarBorrador: vi.fn().mockResolvedValue(undefined),
      eliminarBorrador: vi.fn().mockResolvedValue(undefined),
    };
    mockClimaService = {
      consultarClima: vi.fn().mockReturnValue(
        of({
          temperatura: 16.5,
          precipitacion: 1.2,
          codigoWmo: 3,
          descripcion: 'Nublado',
          alertaLluvia: false,
          icono: 'cloud-outline',
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [RegistroPage],
      providers: [
        provideRouter([]),
        { provide: IncidenciasService, useValue: mockIncidenciasService },
        { provide: CamaraService, useValue: mockCamaraService },
        { provide: UbicacionService, useValue: mockUbicacionService },
        { provide: BorradorService, useValue: mockBorradorService },
        { provide: ClimaService, useValue: mockClimaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('valida campos obligatorios y bloquea el envío si el formulario está incompleto (R5)', () => {
    component.descripcion.set('');
    component.direccion.set('');
    component.sector.set('');

    component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).not.toHaveBeenCalled();
    expect(component.errores().descripcion).toBeDefined();
    expect(component.errores().direccion).toBeDefined();
    expect(component.errores().sector).toBeDefined();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('La descripción técnica es obligatoria');
    expect(compiled.textContent).toContain('La dirección exacta del daño es obligatoria');
  });

  it('regla R5: en prioridad ALTA la foto es obligatoria y bloquea el guardado si falta', () => {
    component.tipo.set('bache');
    component.descripcion.set('Hundimiento de asfalto pronunciado');
    component.direccion.set('Av. Prensa y Florida');
    component.sector.set('Cotocollao');
    component.prioridad.set('alta');
    component.foto.set(''); // Sin foto

    component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).not.toHaveBeenCalled();
    expect(component.errores().foto).toContain('prioridad ALTA es obligatorio adjuntar una fotografía');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('prioridad ALTA es obligatorio adjuntar una fotografía');
  });

  it('regla R5: en prioridad media o baja la fotografía es opcional y permite guardar', async () => {
    mockIncidenciasService.crearIncidencia.mockReturnValue(
      of({
        ...nuevaRespuesta,
        id: '28',
        prioridad: 'media',
        foto: null,
      }),
    );

    component.tipo.set('luminaria');
    component.descripcion.set('Lámpara parpadeante en poste');
    component.direccion.set('Calle Guayaquil y Chile');
    component.sector.set('Centro Histórico');
    component.prioridad.set('media');
    component.foto.set(''); // Opcional en media

    await component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalled();
    expect(component.incidenciaCreada()).toBe('INC-28');
  });

  it('permite registrar en prioridad ALTA cuando la fotografía está presente', async () => {
    mockIncidenciasService.crearIncidencia.mockReturnValue(of(nuevaRespuesta));

    component.tipo.set('bache');
    component.descripcion.set('Bache profundo en el carril central');
    component.direccion.set('Av. Amazonas y Eloy Alfaro');
    component.sector.set('Iñaquito');
    component.prioridad.set('alta');
    component.foto.set('data:image/jpeg;base64,samplephoto');
    component.lat.set(-0.18);
    component.lon.set(-78.48);

    await component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'bache',
        prioridad: 'alta',
        foto: 'data:image/jpeg;base64,samplephoto',
        estado: 'pendiente',
      }),
    );
    expect(component.incidenciaCreada()).toBe('INC-27');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('¡Incidencia registrada con éxito!');
    expect(compiled.textContent).toContain('INC-27');
  });

  it('maneja fallos de red o servidor sin perder los datos diligenciados', async () => {
    const errorRed: ErrorConsultaIncidencias = {
      tipo: 'red',
      status: 0,
      mensaje: 'Fallo de conexión con el servidor municipal.',
    };
    mockIncidenciasService.crearIncidencia.mockReturnValue(throwError(() => errorRed));

    component.tipo.set('alcantarilla');
    component.descripcion.set('Tapa de alcantarilla rota con riesgo');
    component.direccion.set('Av. América y Patria');
    component.sector.set('Mariscal Sucre');
    component.prioridad.set('media');

    await component.guardar();
    fixture.detectChanges();

    expect(component.errorServidor()).toContain('Fallo de conexión');
    // Los datos deben persistir en el formulario para no frustrar al usuario
    expect(component.descripcion()).toBe('Tapa de alcantarilla rota con riesgo');
    expect(component.direccion()).toBe('Av. América y Patria');
  });

  it('captura fotografía con CamaraService y muestra la previsualización (R6)', async () => {
    mockCamaraService.capturarFoto.mockResolvedValue('data:image/jpeg;base64,evidencianueva');

    await component.tomarFotoConCamara();
    fixture.detectChanges();

    expect(mockCamaraService.capturarFoto).toHaveBeenCalled();
    expect(component.foto()).toBe('data:image/jpeg;base64,evidencianueva');

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('.foto-previa-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('data:image/jpeg;base64,evidencianueva');
  });

  it('al seleccionar una imagen de galería la comprime con asegurarLimiteTamanio para evitar 413 (R5/R6)', async () => {
    mockCamaraService.asegurarLimiteTamanio.mockResolvedValue('data:image/jpeg;base64,optimizada70kb');

    const fakeFile = new Blob(['contenido de imagen de prueba'], { type: 'image/jpeg' });
    const fakeInput = {
      files: [fakeFile],
      value: 'C:\\fakepath\\foto.jpg',
    } as unknown as HTMLInputElement;

    const fakeEvent = {
      target: fakeInput,
    } as unknown as Event;

    component.onFileSelected(fakeEvent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCamaraService.asegurarLimiteTamanio).toHaveBeenCalledWith(expect.any(String), 70);
    expect(component.foto()).toBe('data:image/jpeg;base64,optimizada70kb');
    expect(fakeInput.value).toBe('');
  });

  it('cancelar la captura de foto deja los datos del formulario intactos (R6)', async () => {
    mockCamaraService.capturarFoto.mockResolvedValue(null);

    component.descripcion.set('Poste inclinado 30 grados');
    component.direccion.set('Av. Ilaló y Río Amazonas');
    component.sector.set('Cumbayá');

    await component.tomarFotoConCamara();
    fixture.detectChanges();

    expect(component.descripcion()).toBe('Poste inclinado 30 grados');
    expect(component.direccion()).toBe('Av. Ilaló y Río Amazonas');
    expect(component.sector()).toBe('Cumbayá');
    expect(component.foto()).toBe('');
  });

  it('explica el permiso denegado de cámara y bloquea el guardado en prioridad ALTA (R6)', async () => {
    mockCamaraService.capturarFoto.mockRejectedValue({
      tipo: 'permiso_denegado',
      mensaje: 'El acceso a la cámara fue denegado por el usuario.',
    });

    component.prioridad.set('alta');
    component.descripcion.set('Rotura mayor de tubería de agua potable');
    component.direccion.set('Av. Pichincha y Sucre');
    component.sector.set('Centro Histórico');

    await component.tomarFotoConCamara();
    fixture.detectChanges();

    expect(component.errorPermisoCamara()).toContain('Permiso de cámara denegado');

    // Intentar guardar incompleto
    component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).not.toHaveBeenCalled();
    expect(component.errores().foto).toBeDefined();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Permiso de cámara denegado');
  });

  it('obtiene la posición GPS actual del sensor y asigna coordenadas (R7)', async () => {
    mockUbicacionService.obtenerPosicionActual.mockResolvedValue({ lat: -0.1806, lon: -78.4678 });

    await component.obtenerUbicacionActual();
    fixture.detectChanges();

    expect(mockUbicacionService.obtenerPosicionActual).toHaveBeenCalled();
    expect(component.lat()).toBe(-0.1806);
    expect(component.lon()).toBe(-78.4678);
  });

  it('regla R7: para tipo BACHE las coordenadas son obligatorias y bloquea guardado si faltan', () => {
    component.tipo.set('bache');
    component.descripcion.set('Hueco profundo en el asfalto carril norte');
    component.direccion.set('Av. 10 de Agosto y Mariana de Jesús');
    component.sector.set('Mariscal Sucre');
    component.prioridad.set('media');
    component.lat.set(null);
    component.lon.set(null);

    component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).not.toHaveBeenCalled();
    expect(component.errores().coordenadas).toContain('coordenadas geográficas son obligatorias');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('coordenadas geográficas son obligatorias');
  });

  it('regla R7: permite guardar BACHE con coordenadas manuales válidas cuando el GPS falla', async () => {
    mockIncidenciasService.crearIncidencia.mockReturnValue(of(nuevaRespuesta));

    component.tipo.set('bache');
    component.descripcion.set('Hueco profundo en el asfalto carril norte');
    component.direccion.set('Av. 10 de Agosto y Mariana de Jesús');
    component.sector.set('Mariscal Sucre');
    component.prioridad.set('alta');
    component.foto.set('data:image/jpeg;base64,samplephoto');
    // Coordenadas manuales válidas
    component.lat.set(-0.1945);
    component.lon.set(-78.4912);

    await component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'bache',
        lat: -0.1945,
        lon: -78.4912,
      }),
    );
    expect(component.incidenciaCreada()).toBe('INC-27');
  });

  it('valida que las coordenadas manuales estén en rangos válidos (-90..90, -180..180)', () => {
    component.tipo.set('bache');
    component.descripcion.set('Bache con coordenadas fuera de rango');
    component.direccion.set('Av. Prensa');
    component.sector.set('Cotocollao');
    component.prioridad.set('media');
    component.lat.set(95); // Fuera de rango
    component.lon.set(-78);

    component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).not.toHaveBeenCalled();
    expect(component.errores().coordenadas).toBeDefined();
  });

  it('en otros tipos de incidencia las coordenadas son opcionales y permite guardar sin ellas', async () => {
    mockIncidenciasService.crearIncidencia.mockReturnValue(
      of({
        ...nuevaRespuesta,
        id: '29',
        tipo: 'parque',
        lat: null,
        lon: null,
        prioridad: 'baja',
        foto: null,
      }),
    );

    component.tipo.set('parque');
    component.descripcion.set('Banca de madera rota en parque La Carolina');
    component.direccion.set('Av. Shyris y Portugal');
    component.sector.set('Iñaquito');
    component.prioridad.set('baja');
    component.lat.set(null);
    component.lon.set(null);

    await component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'parque',
        lat: null,
        lon: null,
      }),
    );
    expect(component.incidenciaCreada()).toBe('INC-29');
  });

  it('ofrece continuar o descartar si existe un borrador incompleto al reabrir el formulario (R8)', async () => {
    mockBorradorService.obtenerBorrador.mockResolvedValue({
      tipo: 'alcantarilla',
      descripcion: 'Borrador rescatado del almacenamiento',
      direccion: 'Av. Colón y 10 de Agosto',
      sector: 'Mariscal Sucre',
      prioridad: 'media',
      foto: null,
      lat: -0.19,
      lon: -78.49,
      fechaGuardado: '2026-10-28T10:00:00Z',
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.borradorPendiente()).toBeTruthy();
    expect(component.borradorPendiente()?.descripcion).toBe('Borrador rescatado del almacenamiento');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Registro incompleto recuperado (R8)');
    expect(compiled.textContent).toContain('Continuar reporte');
    expect(compiled.textContent).toContain('Descartar');
  });

  it('al pulsar continuar restaura todos los datos del borrador en el formulario (R8)', async () => {
    component.borradorPendiente.set({
      tipo: 'bache',
      descripcion: 'Bache con agua acumulada recuperado',
      direccion: 'Calle Guayaquil N12',
      sector: 'Centro Histórico',
      prioridad: 'alta',
      foto: 'data:image/jpeg;base64,fotoborrador',
      lat: -0.22,
      lon: -78.51,
      fechaGuardado: '2026-10-28T10:00:00Z',
    });

    component.continuarBorrador();
    fixture.detectChanges();

    expect(component.tipo()).toBe('bache');
    expect(component.descripcion()).toBe('Bache con agua acumulada recuperado');
    expect(component.direccion()).toBe('Calle Guayaquil N12');
    expect(component.sector()).toBe('Centro Histórico');
    expect(component.prioridad()).toBe('alta');
    expect(component.foto()).toBe('data:image/jpeg;base64,fotoborrador');
    expect(component.lat()).toBe(-0.22);
    expect(component.lon()).toBe(-78.51);
    expect(component.borradorPendiente()).toBeNull();
  });

  it('al pulsar descartar borrador elimina el almacenamiento local y limpia el formulario (R8)', async () => {
    component.borradorPendiente.set({
      tipo: 'luminaria',
      descripcion: 'Borrador a descartar',
      direccion: 'Calle X',
      sector: 'Quitumbe',
      prioridad: 'baja',
      fechaGuardado: '2026-10-28T10:00:00Z',
    });

    await component.descartarBorrador();
    fixture.detectChanges();

    expect(mockBorradorService.eliminarBorrador).toHaveBeenCalled();
    expect(component.borradorPendiente()).toBeNull();
    expect(component.descripcion()).toBe('');
  });

  it('guarda automáticamente el borrador con debounce tras editar la descripción (R8)', () => {
    vi.useFakeTimers();
    try {
      component.descripcion.set('Bache peligroso que requiere inspección inmediata');
      fixture.detectChanges();

      // Antes del debounce de 500 ms no debe haberse guardado todavía
      vi.advanceTimersByTime(200);
      expect(mockBorradorService.guardarBorrador).not.toHaveBeenCalled();

      // Al avanzar superando los 500 ms (ej. 600 ms en total) debe persistir el borrador
      vi.advanceTimersByTime(400);
      expect(mockBorradorService.guardarBorrador).toHaveBeenCalled();
      expect(mockBorradorService.guardarBorrador).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: 'Bache peligroso que requiere inspección inmediata',
          tipo: 'luminaria',
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('guarda el borrador inmediatamente si el inspector sale de la vista en ionViewWillLeave (R8)', () => {
    component.descripcion.set('Avance de reporte antes de salir');
    component.ionViewWillLeave();

    expect(mockBorradorService.guardarBorrador).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: 'Avance de reporte antes de salir',
      }),
    );
  });

  it('al guardar exitosamente elimina el borrador local para no reaparecer (R8)', async () => {
    mockIncidenciasService.crearIncidencia.mockReturnValue(of(nuevaRespuesta));

    component.tipo.set('luminaria');
    component.descripcion.set('Luminaria reparada lista para reporte');
    component.direccion.set('Av. Patria y 12 de Octubre');
    component.sector.set('Mariscal Sucre');
    component.prioridad.set('media');

    await component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalled();
    expect(mockBorradorService.eliminarBorrador).toHaveBeenCalled();
  });

  it('consulta el reporte meteorológico en tiempo real al solicitarlo (R4)', async () => {
    component.lat.set(-0.19);
    component.lon.set(-78.49);

    await component.consultarClimaZona();
    fixture.detectChanges();

    expect(mockClimaService.consultarClima).toHaveBeenCalledWith(-0.19, -78.49);
    expect(component.clima()).toEqual({
      temperatura: 16.5,
      precipitacion: 1.2,
      codigoWmo: 3,
      descripcion: 'Nublado',
      alertaLluvia: false,
      icono: 'cloud-outline',
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nublado');
    expect(compiled.textContent).toContain('16.5 °C');
    expect(compiled.textContent).toContain('1.2 mm/h');
  });

  it('muestra advertencia cuando la precipitación supera 5 mm/h sin bloquear el guardado (R4)', async () => {
    mockClimaService.consultarClima.mockReturnValue(
      of({
        temperatura: 14.0,
        precipitacion: 8.5,
        codigoWmo: 65,
        descripcion: 'Lluvia constante',
        alertaLluvia: true,
        icono: 'rainy-outline',
      }),
    );
    mockIncidenciasService.crearIncidencia.mockReturnValue(of(nuevaRespuesta));

    await component.consultarClimaZona();
    fixture.detectChanges();

    expect(component.clima()?.alertaLluvia).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Aviso de lluvia intensa (8.5 mm/h)');
    expect(compiled.textContent).toContain('no bloquea');

    // Comprobar que permite guardar sin bloqueo
    component.tipo.set('luminaria');
    component.descripcion.set('Revisión en condiciones de lluvia');
    component.direccion.set('Av. 10 de Agosto');
    component.sector.set('Iñaquito');
    component.prioridad.set('baja');

    await component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalled();
  });

  it('si la API meteorológica falla, muestra aviso informativo y permite continuar el guardado (R4)', async () => {
    mockClimaService.consultarClima.mockReturnValue(
      throwError(() => ({
        mensaje: 'Error de conexión con el servicio Open-Meteo',
      })),
    );
    mockIncidenciasService.crearIncidencia.mockReturnValue(of(nuevaRespuesta));

    await component.consultarClimaZona();
    fixture.detectChanges();

    expect(component.errorClima()).toContain('Error de conexión con el servicio Open-Meteo');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Error de conexión con el servicio Open-Meteo');

    // El guardado debe proceder con normalidad
    component.tipo.set('luminaria');
    component.descripcion.set('Reporte sin datos de clima');
    component.direccion.set('Av. Mariana de Jesús');
    component.sector.set('Mariscal Sucre');
    component.prioridad.set('media');

    await component.guardar();
    fixture.detectChanges();

    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalled();
  });

  it('en guardar() si el clima no ha sido consultado lo consulta antes de enviar a MockAPI (R4)', async () => {
    mockIncidenciasService.crearIncidencia.mockReturnValue(of(nuevaRespuesta));

    component.tipo.set('luminaria');
    component.descripcion.set('Reporte con consulta climática automática');
    component.direccion.set('Av. Eloy Alfaro');
    component.sector.set('Iñaquito');
    component.prioridad.set('media');
    component.lat.set(-0.1807);
    component.lon.set(-78.4678);

    expect(component.climaConsultado()).toBe(false);

    await component.guardar();
    fixture.detectChanges();

    expect(mockClimaService.consultarClima).toHaveBeenCalled();
    expect(mockIncidenciasService.crearIncidencia).toHaveBeenCalled();
  });
});
