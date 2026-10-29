import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import type { Incidencia } from '../../models/incidencia.model';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';
import { SeguimientoService } from '../../services/seguimiento.service';

import { ListadoPage } from './listado.page';

describe('ListadoPage', () => {
  let component: ListadoPage;
  let fixture: ComponentFixture<ListadoPage>;
  let mockIncidenciasService: {
    getIncidencias: ReturnType<typeof vi.fn>;
  };
  let mockSeguimientoService: {
    estaEnSeguimiento: ReturnType<typeof vi.fn>;
    alternarSeguimiento: ReturnType<typeof vi.fn>;
  };

  const pagina1: Incidencia[] = Array.from({ length: 10 }, (_, i) => ({
    id: `${i + 1}`,
    tipo: 'luminaria',
    descripcion: `Incidencia de prueba ${i + 1}`,
    direccion: `Calle ${i + 1}`,
    sector: 'Centro Histórico',
    fecha: '2026-10-01T08:30:00',
    estado: 'pendiente',
    prioridad: 'baja',
    foto:
      i % 2 === 0
        ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        : '',
    lat: -0.22,
    lon: -78.51,
    observacion: '',
  }));

  const pagina2: Incidencia[] = Array.from({ length: 10 }, (_, i) => ({
    id: `${i + 11}`,
    tipo: 'bache',
    descripcion: `Incidencia de prueba ${i + 11}`,
    direccion: `Avenida ${i + 11}`,
    sector: 'La Marín',
    fecha: '2026-10-02T09:30:00',
    estado: 'en_proceso',
    prioridad: 'media',
    foto: '',
    lat: -0.21,
    lon: -78.52,
    observacion: '',
  }));

  const pagina3Corta: Incidencia[] = Array.from({ length: 6 }, (_, i) => ({
    id: `${i + 21}`,
    tipo: 'parque',
    descripcion: `Incidencia final ${i + 21}`,
    direccion: `Parque ${i + 21}`,
    sector: 'La Carolina',
    fecha: '2026-10-03T10:00:00',
    estado: 'resuelta',
    prioridad: 'alta',
    foto: '',
    lat: -0.18,
    lon: -78.48,
    observacion: 'Resuelto con éxito',
  }));

  beforeEach(async () => {
    mockIncidenciasService = {
      getIncidencias: vi.fn().mockReturnValue(of(pagina1)),
    };
    mockSeguimientoService = {
      estaEnSeguimiento: vi.fn().mockReturnValue(false),
      alternarSeguimiento: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ListadoPage],
      providers: [
        provideRouter([]),
        { provide: IncidenciasService, useValue: mockIncidenciasService },
        { provide: SeguimientoService, useValue: mockSeguimientoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoPage);
    component = fixture.componentInstance;
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('carga la primera página completa y habilita hasMore (R2)', () => {
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('exito');
    expect(component.incidencias().length).toBe(10);
    expect(component.hasMore()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('INC-1');
    expect(compiled.textContent).toContain('INC-10');
  });

  it('concatena la página 2 incrementalmente con cargarMas (R3)', () => {
    component.ionViewWillEnter();
    fixture.detectChanges();

    mockIncidenciasService.getIncidencias.mockReturnValue(of(pagina2));

    const mockEvent = {
      target: {
        complete: vi.fn(),
      } as unknown as HTMLIonInfiniteScrollElement,
    };

    component.cargarMas(mockEvent);
    fixture.detectChanges();

    expect(component.paginaActual()).toBe(2);
    expect(component.incidencias().length).toBe(20);
    expect(component.hasMore()).toBe(true);
    expect(mockEvent.target.complete).toHaveBeenCalled();
  });

  it('ignora registros duplicados mediante Set al concatenar páginas (R3 anti-duplicados)', () => {
    component.ionViewWillEnter();
    fixture.detectChanges();

    // Página 2 contiene un duplicado de la página 1 (id: '1')
    const paginaConDuplicado: Incidencia[] = [
      pagina1[0],
      {
        id: '99',
        tipo: 'alcantarilla',
        descripcion: 'Nuevo registro no duplicado',
        direccion: 'Calle 99',
        sector: 'Calderón',
        fecha: '2026-10-04T12:00:00',
        estado: 'pendiente',
        prioridad: 'alta',
        foto: '',
      },
    ];

    mockIncidenciasService.getIncidencias.mockReturnValue(of(paginaConDuplicado));

    component.cargarMas();
    fixture.detectChanges();

    // Debe tener 11 registros (10 iniciales + 1 nuevo no duplicado)
    expect(component.incidencias().length).toBe(11);
    expect(component.incidencias().some((i) => i.id === '99')).toBe(true);
  });

  it('detecta fin de datos con página corta (< 10) y no permite pedir página 4 (R3)', () => {
    component.ionViewWillEnter();
    fixture.detectChanges();

    // Cargar página 2
    mockIncidenciasService.getIncidencias.mockReturnValue(of(pagina2));
    component.cargarMas();
    fixture.detectChanges();

    // Cargar página 3 (solo 6 registros)
    mockIncidenciasService.getIncidencias.mockReturnValue(of(pagina3Corta));
    component.cargarMas();
    fixture.detectChanges();

    expect(component.paginaActual()).toBe(3);
    expect(component.incidencias().length).toBe(26);
    expect(component.hasMore()).toBe(false);

    // Intentar pedir página 4: NUNCA debe llamar al servicio
    mockIncidenciasService.getIncidencias.mockClear();
    const eventMock = {
      target: { complete: vi.fn() } as unknown as HTMLIonInfiniteScrollElement,
    };

    component.cargarMas(eventMock);
    expect(mockIncidenciasService.getIncidencias).not.toHaveBeenCalled();
    expect(eventMock.target.complete).toHaveBeenCalled();
  });

  it('maneja error en cargarMas sin borrar lo cargado y llamando a complete() (R3)', () => {
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.incidencias().length).toBe(10);

    const errorSimulado: ErrorConsultaIncidencias = {
      tipo: 'red',
      status: 0,
      mensaje: 'Fallo de conexión al pedir siguiente página',
    };
    mockIncidenciasService.getIncidencias.mockReturnValue(throwError(() => errorSimulado));

    const eventMock = {
      target: { complete: vi.fn() } as unknown as HTMLIonInfiniteScrollElement,
    };

    component.cargarMas(eventMock);
    fixture.detectChanges();

    // Lo ya cargado sigue intacto
    expect(component.incidencias().length).toBe(10);
    expect(component.errorCargaMas()).toContain('Fallo de conexión');
    expect(eventMock.target.complete).toHaveBeenCalled();
  });

  it('muestra estado vacío si la primera página devuelve []', () => {
    mockIncidenciasService.getIncidencias.mockReturnValue(of([]));

    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('vacio');
    expect(component.incidencias().length).toBe(0);
    expect(component.hasMore()).toBe(false);
  });

  it('permite alternar el seguimiento de una incidencia desde la tarjeta (R1)', async () => {
    const fakeEvent = new Event('click');
    const stopPropagationSpy = vi.spyOn(fakeEvent, 'stopPropagation');

    await component.toggleSeguimiento(fakeEvent, '3');

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(mockSeguimientoService.alternarSeguimiento).toHaveBeenCalledWith('3');
  });
});
