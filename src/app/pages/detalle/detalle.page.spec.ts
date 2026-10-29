import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import type { Incidencia } from '../../models/incidencia.model';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';
import { SeguimientoService } from '../../services/seguimiento.service';

import { DetallePage } from './detalle.page';

describe('DetallePage (R9)', () => {
  let component: DetallePage;
  let fixture: ComponentFixture<DetallePage>;
  let mockIncidenciasService: {
    getIncidenciaById: ReturnType<typeof vi.fn>;
    actualizarEstado: ReturnType<typeof vi.fn>;
  };
  let mockSeguimientoService: {
    estaEnSeguimiento: ReturnType<typeof vi.fn>;
    alternarSeguimiento: ReturnType<typeof vi.fn>;
  };

  const mockIncidenciaPendiente: Incidencia = {
    id: '7',
    tipo: 'luminaria',
    descripcion: 'Luminaria intermitente frente a la parada',
    direccion: 'Av. 6 de Diciembre y Orellana',
    sector: 'Mariscal Sucre',
    fecha: '2026-10-15T19:30:00',
    estado: 'pendiente',
    prioridad: 'alta',
    foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    lat: -0.2033,
    lon: -78.4899,
    observacion: '',
  };

  const mockIncidenciaEnProceso: Incidencia = {
    ...mockIncidenciaPendiente,
    id: '8',
    estado: 'en_proceso',
    observacion: 'Cuadrilla norte asignada a inspección',
  };

  const mockIncidenciaResuelta: Incidencia = {
    ...mockIncidenciaPendiente,
    id: '9',
    estado: 'resuelta',
    observacion: 'Sustitución de balasto y foco LED efectuada',
  };

  beforeEach(async () => {
    mockIncidenciasService = {
      getIncidenciaById: vi.fn(),
      actualizarEstado: vi.fn(),
    };
    mockSeguimientoService = {
      estaEnSeguimiento: vi.fn().mockReturnValue(false),
      alternarSeguimiento: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DetallePage],
      providers: [
        provideRouter([]),
        { provide: IncidenciasService, useValue: mockIncidenciasService },
        { provide: SeguimientoService, useValue: mockSeguimientoService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '7' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePage);
    component = fixture.componentInstance;
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('carga la incidencia por ID y muestra los datos en estado éxito', () => {
    mockIncidenciasService.getIncidenciaById.mockReturnValue(of(mockIncidenciaPendiente));

    component.id = '7';
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(mockIncidenciasService.getIncidenciaById).toHaveBeenCalledWith('7');
    expect(component.estadoVisual()).toBe('exito');
    expect(component.incidencia()).toEqual(mockIncidenciaPendiente);
    expect(component.obtenerCodigo()).toBe('INC-7');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('INC-7');
    expect(compiled.textContent).toContain('Luminaria dañada');
    expect(compiled.textContent).toContain('Mariscal Sucre');
    expect(compiled.textContent).toContain('Av. 6 de Diciembre y Orellana');
  });

  it('muestra estado de error apropiado para 404 (no encontrado)', () => {
    const error404: ErrorConsultaIncidencias = {
      tipo: 'no_encontrado',
      status: 404,
      mensaje: 'La incidencia INC-999 no fue encontrada en el sistema municipal (código 404).',
    };
    mockIncidenciasService.getIncidenciaById.mockReturnValue(throwError(() => error404));

    component.id = '999';
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('error');
    expect(component.errorInfo()?.tipo).toBe('no_encontrado');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Incidencia no encontrada');
    expect(compiled.textContent).toContain('Volver al listado');
  });

  it('muestra estado de error y botón de reintento ante caída de red (status 0)', () => {
    const errorRed: ErrorConsultaIncidencias = {
      tipo: 'red',
      status: 0,
      mensaje: 'No fue posible establecer conexión con el sistema municipal.',
    };
    mockIncidenciasService.getIncidenciaById.mockReturnValue(throwError(() => errorRed));

    component.id = '7';
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('error');
    expect(component.errorInfo()?.tipo).toBe('red');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Problema de conexión');
    expect(compiled.textContent).toContain('Reintentar consulta');
  });

  it('permite transición de pendiente a en_proceso (R9)', () => {
    mockIncidenciasService.getIncidenciaById.mockReturnValue(of(mockIncidenciaPendiente));
    const respuestaEnProceso: Incidencia = {
      ...mockIncidenciaPendiente,
      estado: 'en_proceso',
    };
    mockIncidenciasService.actualizarEstado.mockReturnValue(of(respuestaEnProceso));

    component.id = '7';
    component.ionViewWillEnter();
    fixture.detectChanges();

    component.cambiarEstado('en_proceso');
    fixture.detectChanges();

    expect(mockIncidenciasService.actualizarEstado).toHaveBeenCalledWith('7', 'en_proceso', undefined);
    expect(component.incidencia()?.estado).toBe('en_proceso');
    expect(component.mensajeExito()).toContain('En proceso');
  });

  it('exige obligatoriamente una observación para pasar a resuelta y bloquea el envío si está vacía (R9)', () => {
    mockIncidenciasService.getIncidenciaById.mockReturnValue(of(mockIncidenciaEnProceso));

    component.id = '8';
    component.ionViewWillEnter();
    fixture.detectChanges();

    // Intentar resolver con observación vacía
    component.observacion.set('   ');
    component.cambiarEstado('resuelta');
    fixture.detectChanges();

    // No debe haber llamado al servicio
    expect(mockIncidenciasService.actualizarEstado).not.toHaveBeenCalled();
    expect(component.errorObservacion()).toContain('obligatorio registrar una observación');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('obligatorio registrar una observación');
  });

  it('permite pasar a resuelta si la observación técnica está diligenciada (R9)', () => {
    mockIncidenciasService.getIncidenciaById.mockReturnValue(of(mockIncidenciaEnProceso));
    const respuestaResuelta: Incidencia = {
      ...mockIncidenciaEnProceso,
      estado: 'resuelta',
      observacion: 'Foco sustituido y cableado verificado satisfactoriamente.',
    };
    mockIncidenciasService.actualizarEstado.mockReturnValue(of(respuestaResuelta));

    component.id = '8';
    component.ionViewWillEnter();
    fixture.detectChanges();

    component.observacion.set('Foco sustituido y cableado verificado satisfactoriamente.');
    component.cambiarEstado('resuelta');
    fixture.detectChanges();

    expect(mockIncidenciasService.actualizarEstado).toHaveBeenCalledWith(
      '8',
      'resuelta',
      'Foco sustituido y cableado verificado satisfactoriamente.',
    );
    expect(component.incidencia()?.estado).toBe('resuelta');
    expect(component.mensajeExito()).toContain('Resuelta');
  });

  it('impide modificar el estado o retroceder cuando la incidencia ya está resuelta (R9)', () => {
    mockIncidenciasService.getIncidenciaById.mockReturnValue(of(mockIncidenciaResuelta));

    component.id = '9';
    component.ionViewWillEnter();
    fixture.detectChanges();

    // Intentar retroceder o modificar
    component.cambiarEstado('en_proceso');
    fixture.detectChanges();

    expect(mockIncidenciasService.actualizarEstado).not.toHaveBeenCalled();
    expect(component.errorTransicion()).toContain('no admite cambios ni retrocesos');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Incidencia finalizada y resuelta');
    expect(compiled.textContent).not.toContain('Pasar a En Proceso');
  });

  it('permite alternar el seguimiento de la incidencia desde la cabecera (R1)', async () => {
    mockIncidenciasService.getIncidenciaById.mockReturnValue(of(mockIncidenciaPendiente));
    component.id = '7';
    component.ionViewWillEnter();
    fixture.detectChanges();

    await component.toggleSeguimiento();

    expect(mockSeguimientoService.alternarSeguimiento).toHaveBeenCalledWith('7');
  });
});
