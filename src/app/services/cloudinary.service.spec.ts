import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CloudinaryService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CloudinaryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('retorna la URL tal cual si no es data:image', async () => {
    const url = 'https://res.cloudinary.com/test/image.jpg';
    const resultado = await service.subirImagen(url);
    expect(resultado).toBe(url);
  });

  it('sube una imagen data:image y retorna la secure_url devuelta por Cloudinary', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const promesa = service.subirImagen(dataUrl);

    // Esperar a que se completen los microtasks asíncronos previos a la llamada HTTP
    await new Promise((r) => setTimeout(r, 20));

    const req = httpMock.expectOne((r) => r.url.includes('api.cloudinary.com'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    req.flush({
      secure_url: 'https://res.cloudinary.com/btmr3o2b/image/upload/v12345/test.png',
      public_id: 'test',
    });

    const resultado = await promesa;
    expect(resultado).toBe('https://res.cloudinary.com/btmr3o2b/image/upload/v12345/test.png');
  });

  it('retorna null ante error HTTP para permitir fallback a base64', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const promesa = service.subirImagen(dataUrl);

    await new Promise((r) => setTimeout(r, 20));

    const req = httpMock.expectOne((r) => r.url.includes('api.cloudinary.com'));
    req.flush('Upload error', { status: 500, statusText: 'Server Error' });

    const resultado = await promesa;
    expect(resultado).toBeNull();
  });
});
