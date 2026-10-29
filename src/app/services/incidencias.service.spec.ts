import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import type { Incidencia } from '../models/incidencia.model';

import type { ErrorConsultaIncidencias } from './incidencias.service';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasService', () => {
  let service: IncidenciasService;
  let httpTesting: HttpTestingController;

  const mockIncidencias: Incidencia[] = [
    {
      id: '1',
      tipo: 'luminaria',
      descripcion: 'Luminaria apagada en la vía',
      direccion: 'Av. República y Guayaquil',
      sector: 'Centro Histórico',
      fecha: '2026-10-01T08:30:00',
      estado: 'pendiente',
      prioridad: 'baja',
      foto: '',
      lat: -0.2201,
      lon: -78.5123,
      observacion: '',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IncidenciasService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(IncidenciasService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('consulta la primera página con los parámetros por defecto', () => {
    let resultado: Incidencia[] | undefined;

    service.getIncidencias().subscribe({
      next: (data) => {
        resultado = data;
      },
    });

    const req = httpTesting.expectOne(
      (r) => r.url === environment.incidenciasApiUrl && r.params.get('page') === '1' && r.params.get('limit') === '10',
    );

    expect(req.request.method).toBe('GET');
    req.flush(mockIncidencias);

    expect(resultado).toEqual(mockIncidencias);
  });

  it('clasifica un error de red (status 0) con tipo "red"', () => {
    let errorCapturado: ErrorConsultaIncidencias | undefined;

    service.getIncidencias().subscribe({
      next: () => {
        throw new Error('No debería tener éxito');
      },
      error: (err: ErrorConsultaIncidencias) => {
        errorCapturado = err;
      },
    });

    const req = httpTesting.expectOne((r) => r.url === environment.incidenciasApiUrl);
    req.error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });

    expect(errorCapturado).toBeDefined();
    expect(errorCapturado?.tipo).toBe('red');
    expect(errorCapturado?.status).toBe(0);
    expect(errorCapturado?.mensaje).toContain('conexión a internet');
  });

  it('clasifica un error 404 con tipo "no_encontrado"', () => {
    let errorCapturado: ErrorConsultaIncidencias | undefined;

    service.getIncidencias().subscribe({
      next: () => {
        throw new Error('No debería tener éxito');
      },
      error: (err: ErrorConsultaIncidencias) => {
        errorCapturado = err;
      },
    });

    const req = httpTesting.expectOne((r) => r.url === environment.incidenciasApiUrl);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(errorCapturado).toBeDefined();
    expect(errorCapturado?.tipo).toBe('no_encontrado');
    expect(errorCapturado?.status).toBe(404);
    expect(errorCapturado?.mensaje).toContain('404');
  });

  it('clasifica errores del servidor (500) con tipo "desconocido"', () => {
    let errorCapturado: ErrorConsultaIncidencias | undefined;

    service.getIncidencias().subscribe({
      next: () => {
        throw new Error('No debería tener éxito');
      },
      error: (err: ErrorConsultaIncidencias) => {
        errorCapturado = err;
      },
    });

    const req = httpTesting.expectOne((r) => r.url === environment.incidenciasApiUrl);
    req.flush('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(errorCapturado).toBeDefined();
    expect(errorCapturado?.tipo).toBe('desconocido');
    expect(errorCapturado?.status).toBe(500);
  });

  it('obtiene una incidencia por ID (R9)', () => {
    let resultado: Incidencia | undefined;

    service.getIncidenciaById('1').subscribe({
      next: (data) => {
        resultado = data;
      },
    });

    const req = httpTesting.expectOne(`${environment.incidenciasApiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockIncidencias[0]);

    expect(resultado).toEqual(mockIncidencias[0]);
  });

  it('clasifica error 404 al buscar incidencia por ID (R9)', () => {
    let errorCapturado: ErrorConsultaIncidencias | undefined;

    service.getIncidenciaById('999').subscribe({
      next: () => {
        throw new Error('No debería tener éxito');
      },
      error: (err: ErrorConsultaIncidencias) => {
        errorCapturado = err;
      },
    });

    const req = httpTesting.expectOne(`${environment.incidenciasApiUrl}/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(errorCapturado).toBeDefined();
    expect(errorCapturado?.tipo).toBe('no_encontrado');
    expect(errorCapturado?.mensaje).toContain('INC-999');
  });

  it('actualiza el estado y observación con PATCH (R9)', () => {
    let resultado: Incidencia | undefined;

    service.actualizarEstado('1', 'resuelta', 'Reparación de luminaria completada por cuadrilla').subscribe({
      next: (data) => {
        resultado = data;
      },
    });

    const req = httpTesting.expectOne(`${environment.incidenciasApiUrl}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      estado: 'resuelta',
      observacion: 'Reparación de luminaria completada por cuadrilla',
    });

    const actualizada: Incidencia = {
      ...mockIncidencias[0],
      estado: 'resuelta',
      observacion: 'Reparación de luminaria completada por cuadrilla',
    };
    req.flush(actualizada);

    expect(resultado?.estado).toBe('resuelta');
    expect(resultado?.observacion).toBe('Reparación de luminaria completada por cuadrilla');
  });

  it('crea una nueva incidencia con POST (R5)', () => {
    let resultado: Incidencia | undefined;
    const nueva = {
      tipo: 'bache' as const,
      descripcion: 'Bache grande en la calzada',
      direccion: 'Av. América y Colón',
      sector: 'Mariscal Sucre',
      fecha: '2026-10-28T10:00:00',
      estado: 'pendiente' as const,
      prioridad: 'alta' as const,
      foto: 'data:image/jpeg;base64,sample',
      lat: -0.2,
      lon: -78.5,
      observacion: '',
    };

    service.crearIncidencia(nueva).subscribe({
      next: (data) => {
        resultado = data;
      },
    });

    const req = httpTesting.expectOne(environment.incidenciasApiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nueva);
    req.flush({ ...nueva, id: '27' });

    expect(resultado?.id).toBe('27');
  });
});
