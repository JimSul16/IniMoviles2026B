import { TestBed } from '@angular/core/testing';
import { Geolocation } from '@capacitor/geolocation';

import { UbicacionService } from './ubicacion.service';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));

describe('UbicacionService (R7)', () => {
  let service: UbicacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UbicacionService],
    });
    service = TestBed.inject(UbicacionService);
    vi.clearAllMocks();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('obtiene la posición GPS actual del dispositivo', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
      coords: {
        latitude: -0.180653,
        longitude: -78.467834,
      },
    } as any);

    const pos = await service.obtenerPosicionActual();
    expect(pos).toEqual({ lat: -0.180653, lon: -78.467834 });
  });

  it('lanza error tipado de permiso_denegado si el usuario deniega el GPS', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('User denied Geolocation'));

    await expect(service.obtenerPosicionActual()).rejects.toMatchObject({
      tipo: 'permiso_denegado',
      mensaje: expect.stringContaining('denegado'),
    });
  });

  it('valida coordenadas geográficas dentro del rango válido (-90..90, -180..180)', () => {
    expect(service.validarCoordenadas(-0.18, -78.48)).toBe(true);
    expect(service.validarCoordenadas(0, 0)).toBe(true);
    expect(service.validarCoordenadas(90, 180)).toBe(true);
    expect(service.validarCoordenadas(-90, -180)).toBe(true);

    // Valores inválidos
    expect(service.validarCoordenadas(91, 0)).toBe(false);
    expect(service.validarCoordenadas(-91, 0)).toBe(false);
    expect(service.validarCoordenadas(0, 181)).toBe(false);
    expect(service.validarCoordenadas(0, -181)).toBe(false);
    expect(service.validarCoordenadas(null, -78.48)).toBe(false);
    expect(service.validarCoordenadas(NaN, -78.48)).toBe(false);
  });
});
