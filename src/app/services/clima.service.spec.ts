import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';

import type { ClimaInfo, ErrorClima } from './clima.service';
import { ClimaService } from './clima.service';

describe('ClimaService (R4)', () => {
  let service: ClimaService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClimaService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClimaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('consulta Open-Meteo con coordenadas personalizadas', () => {
    let resultado: ClimaInfo | undefined;

    service.consultarClima(-0.21, -78.52).subscribe({
      next: (data) => {
        resultado = data;
      },
    });

    const req = httpTesting.expectOne((r) => r.url === environment.climaApiUrl);
    expect(req.request.params.get('latitude')).toBe('-0.21');
    expect(req.request.params.get('longitude')).toBe('-78.52');

    req.flush({
      current: {
        temperature_2m: 17.5,
        precipitation: 2.3,
        weather_code: 1,
      },
    });

    expect(resultado).toBeDefined();
    expect(resultado?.temperatura).toBe(17.5);
    expect(resultado?.precipitacion).toBe(2.3);
    expect(resultado?.descripcion).toBe('Parcialmente nublado');
    expect(resultado?.alertaLluvia).toBe(false);
  });

  it('activa alertaLluvia: true cuando la precipitación supera los 5 mm/h (R4)', () => {
    let resultado: ClimaInfo | undefined;

    service.consultarClima().subscribe({
      next: (data) => {
        resultado = data;
      },
    });

    const req = httpTesting.expectOne((r) => r.url === environment.climaApiUrl);
    // Debe usar Quito Centro como fallback
    expect(req.request.params.get('latitude')).toBe('-0.1807');
    expect(req.request.params.get('longitude')).toBe('-78.4678');

    req.flush({
      current: {
        temperature_2m: 14.0,
        precipitation: 8.5, // > 5 mm/h
        weather_code: 63,
      },
    });

    expect(resultado?.alertaLluvia).toBe(true);
    expect(resultado?.precipitacion).toBe(8.5);
    expect(resultado?.descripcion).toBe('Lluvia constante');
  });

  it('maneja fallos de red devolviendo error con mensaje explicativo no bloqueante', () => {
    let errorCapturado: ErrorClima | undefined;

    service.consultarClima().subscribe({
      next: () => {
        throw new Error('No debería responder éxito');
      },
      error: (err: ErrorClima) => {
        errorCapturado = err;
      },
    });

    const req = httpTesting.expectOne((r) => r.url === environment.climaApiUrl);
    req.error(new ProgressEvent('error'), { status: 0 });

    expect(errorCapturado).toBeDefined();
    expect(errorCapturado?.mensaje).toContain('Open-Meteo');
  });
});
