import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import type { Incidencia } from '../../models/incidencia.model';
import type { ErrorConsultaIncidencias } from '../../services/incidencias.service';
import { IncidenciasService } from '../../services/incidencias.service';

import { ListadoPage } from './listado.page';

describe('ListadoPage', () => {
  let component: ListadoPage;
  let fixture: ComponentFixture<ListadoPage>;
  let mockIncidenciasService: {
    getIncidencias: ReturnType<typeof vi.fn>;
  };

  const listaPrueba: Incidencia[] = [
    {
      id: '1',
      tipo: 'luminaria',
      descripcion: 'Luminaria rota en poste 14',
      direccion: 'Av. República y Guayaquil',
      sector: 'Centro Histórico',
      fecha: '2026-10-01T08:30:00',
      estado: 'pendiente',
      prioridad: 'baja',
      foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      lat: -0.2201,
      lon: -78.5123,
      observacion: '',
    },
    {
      id: '2',
      tipo: 'bache',
      descripcion: 'Bache profundo en carril derecho',
      direccion: 'Calle Venezuela y Baquerizo',
      sector: 'La Marín',
      fecha: '2026-10-02T09:30:00',
      estado: 'en_proceso',
      prioridad: 'media',
      foto: '',
      lat: -0.2137,
      lon: -78.5265,
      observacion: '',
    },
  ];

  beforeEach(async () => {
    mockIncidenciasService = {
      getIncidencias: vi.fn().mockReturnValue(of(listaPrueba)),
    };

    await TestBed.configureTestingModule({
      imports: [ListadoPage],
      providers: [provideRouter([]), { provide: IncidenciasService, useValue: mockIncidenciasService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ListadoPage);
    component = fixture.componentInstance;
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('carga incidencias y pasa al estado de éxito mostrando los 8 campos', () => {
    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('exito');
    expect(component.incidencias().length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;

    // 1. Código
    expect(compiled.textContent).toContain('INC-1');
    expect(compiled.textContent).toContain('INC-2');

    // 2. Tipo
    expect(compiled.textContent).toContain('Luminaria dañada');
    expect(compiled.textContent).toContain('Bache');

    // 3. Descripción
    expect(compiled.textContent).toContain('Luminaria rota en poste 14');
    expect(compiled.textContent).toContain('Bache profundo en carril derecho');

    // 4. Dirección
    expect(compiled.textContent).toContain('Av. República y Guayaquil');
    expect(compiled.textContent).toContain('Calle Venezuela y Baquerizo');

    // 5. Sector
    expect(compiled.textContent).toContain('Centro Histórico');
    expect(compiled.textContent).toContain('La Marín');

    // 6. Fecha (formateada)
    expect(compiled.textContent).toContain('01/10/2026');
    expect(compiled.textContent).toContain('02/10/2026');

    // 7. Estado
    expect(compiled.textContent).toContain('Pendiente');
    expect(compiled.textContent).toContain('En proceso');

    // 8. Fotografía si existe (item 1 tiene foto, item 2 tiene fallback sin evidencia)
    const imagenes = compiled.querySelectorAll('img.foto-img');
    expect(imagenes.length).toBe(1);
    expect(imagenes[0].getAttribute('src')).toBe(listaPrueba[0].foto);
    expect(compiled.textContent).toContain('Sin fotografía de evidencia');
  });

  it('muestra el estado vacío cuando la API devuelve un arreglo sin registros', () => {
    mockIncidenciasService.getIncidencias.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('vacio');
    expect(component.incidencias().length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No existen incidencias');
    expect(compiled.querySelector('.estado-vacio')).toBeTruthy();
  });

  it('muestra el estado de error cuando la consulta falla', () => {
    const errorSimulado: ErrorConsultaIncidencias = {
      tipo: 'red',
      status: 0,
      mensaje: 'No fue posible establecer conexión con el sistema municipal.',
    };
    mockIncidenciasService.getIncidencias.mockReturnValue(throwError(() => errorSimulado));

    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('error');
    expect(component.errorInfo()).toEqual(errorSimulado);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Error de conexión de red');
    expect(compiled.textContent).toContain('No fue posible establecer conexión con el sistema municipal.');
    expect(compiled.querySelector('.estado-error')).toBeTruthy();
  });

  it('permite reintentar la consulta desde el estado de error', () => {
    const errorSimulado: ErrorConsultaIncidencias = {
      tipo: 'red',
      status: 0,
      mensaje: 'Fallo de red.',
    };
    mockIncidenciasService.getIncidencias.mockReturnValue(throwError(() => errorSimulado));

    fixture.detectChanges();
    expect(component.estadoVisual()).toBe('error');

    // Ahora simular que el reintento funciona
    mockIncidenciasService.getIncidencias.mockReturnValue(of(listaPrueba));

    component.cargarIncidencias();
    fixture.detectChanges();

    expect(component.estadoVisual()).toBe('exito');
    expect(component.incidencias().length).toBe(2);
  });
});
