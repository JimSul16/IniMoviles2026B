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
});
