import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import type { Incidencia } from '../../models/incidencia.model';
import { IncidenciasService } from '../../services/incidencias.service';
import { SeguimientoService } from '../../services/seguimiento.service';

import { SeguimientoPage } from './seguimiento.page';

describe('SeguimientoPage (R1 — Seguimiento local persistente)', () => {
  let component: SeguimientoPage;
  let fixture: ComponentFixture<SeguimientoPage>;
  let mockSeguimientoService: {
    cargarIds: ReturnType<typeof vi.fn>;
    desmarcar: ReturnType<typeof vi.fn>;
    estaEnSeguimiento: ReturnType<typeof vi.fn>;
  };
  let mockIncidenciasService: {
    getIncidenciaById: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const incidenciaSeguida1: Incidencia = {
    id: '4',
    tipo: 'luminaria',
    descripcion: 'Luminaria rota en poste frente a escuela',
    direccion: 'Calle Venezuela N8-32 y Esmeraldas',
    sector: 'Centro Histórico',
    fecha: '2026-10-28T09:15:00',
    estado: 'pendiente',
    prioridad: 'alta',
    foto: 'data:image/jpeg;base64,foto4',
    lat: -0.2198,
    lon: -78.5097,
  };

  const incidenciaSeguida2: Incidencia = {
    id: '9',
    tipo: 'bache',
    descripcion: 'Bache con hundimiento en intersección semafórica',
    direccion: 'Av. Shyris y Portugal',
    sector: 'Iñaquito',
    fecha: '2026-10-28T10:45:00',
    estado: 'en_proceso',
    prioridad: 'media',
    foto: null,
    lat: -0.1789,
    lon: -78.4795,
  };

  beforeEach(async () => {
    mockSeguimientoService = {
      cargarIds: vi.fn().mockResolvedValue([]),
      desmarcar: vi.fn().mockResolvedValue(undefined),
      estaEnSeguimiento: vi.fn().mockReturnValue(false),
    };
    mockIncidenciasService = {
      getIncidenciaById: vi.fn(),
    };
    mockRouter = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SeguimientoPage],
      providers: [
        provideRouter([]),
        { provide: SeguimientoService, useValue: mockSeguimientoService },
        { provide: IncidenciasService, useValue: mockIncidenciasService },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    mockRouter = {
      navigate: router.navigate as any,
    };

    fixture = TestBed.createComponent(SeguimientoPage);
    component = fixture.componentInstance;
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('muestra estado vacío cuando no existen incidencias marcadas para seguimiento (R1)', async () => {
    mockSeguimientoService.cargarIds.mockResolvedValue([]);

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.estado()).toBe('vacio');
    expect(component.incidencias().length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No tiene incidencias en seguimiento');
    expect(compiled.textContent).toContain('Ver Listado de Incidencias');
  });

  it('carga y muestra únicamente las incidencias marcadas con los 8 campos (R1)', async () => {
    mockSeguimientoService.cargarIds.mockResolvedValue(['4', '9']);
    mockIncidenciasService.getIncidenciaById.mockImplementation((id: string) => {
      if (id === '4') return of(incidenciaSeguida1);
      if (id === '9') return of(incidenciaSeguida2);
      return throwError(() => new Error('Not found'));
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.estado()).toBe('exito');
    expect(component.incidencias().length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    // Comprobar 8 campos y códigos
    expect(compiled.textContent).toContain('INC-4');
    expect(compiled.textContent).toContain('INC-9');
    expect(compiled.textContent).toContain('Luminaria');
    expect(compiled.textContent).toContain('Bache');
    expect(compiled.textContent).toContain('Luminaria rota en poste');
    expect(compiled.textContent).toContain('Calle Venezuela N8-32');
    expect(compiled.textContent).toContain('Centro Histórico');
    expect(compiled.textContent).toContain('Iñaquito');
    expect(compiled.textContent).toContain('Pendiente');
    expect(compiled.textContent).toContain('En proceso');
  });

  it('al desmarcar una incidencia, desaparece de la vista reactivamente sin tocar la API de oficina (R1)', async () => {
    mockSeguimientoService.cargarIds.mockResolvedValue(['4', '9']);
    mockIncidenciasService.getIncidenciaById.mockImplementation((id: string) => {
      if (id === '4') return of(incidenciaSeguida1);
      if (id === '9') return of(incidenciaSeguida2);
      return throwError(() => new Error('Not found'));
    });

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.incidencias().length).toBe(2);

    // Inspector pulsa "Dejar de seguir" en INC-4
    const fakeEvent = new Event('click');
    await component.desmarcar(fakeEvent, '4');
    fixture.detectChanges();

    expect(mockSeguimientoService.desmarcar).toHaveBeenCalledWith('4');
    // Solo debe quedar INC-9
    expect(component.incidencias().length).toBe(1);
    expect(component.incidencias()[0].id).toBe('9');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('INC-4');
    expect(compiled.textContent).toContain('INC-9');
  });

  it('si se desmarca la última incidencia, la vista transiciona de inmediato a estado vacío (R1)', async () => {
    mockSeguimientoService.cargarIds.mockResolvedValue(['4']);
    mockIncidenciasService.getIncidenciaById.mockReturnValue(of(incidenciaSeguida1));

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.incidencias().length).toBe(1);

    const fakeEvent = new Event('click');
    await component.desmarcar(fakeEvent, '4');
    fixture.detectChanges();

    expect(component.incidencias().length).toBe(0);
    expect(component.estado()).toBe('vacio');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No tiene incidencias en seguimiento');
  });

  it('maneja fallos de sincronización mostrando estado de error y botón de reintento (R1)', async () => {
    mockSeguimientoService.cargarIds.mockResolvedValue(['4', '9']);
    mockIncidenciasService.getIncidenciaById.mockReturnValue(
      throwError(() => ({ tipo: 'red', mensaje: 'Fallo de conexión' })),
    );

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.estado()).toBe('error');
    expect(component.mensajeError()).toContain('No fue posible sincronizar');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Fallo al sincronizar seguimiento');
    expect(compiled.textContent).toContain('Reintentar sincronización');
  });

  it('al pulsar ver detalle navega hacia la ficha técnica de la incidencia', () => {
    component.irADetalle('4');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/incidencias', '4']);
  });

  it('al pulsar ver listado navega hacia /incidencias', () => {
    component.irAlListado();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/incidencias']);
  });
});
