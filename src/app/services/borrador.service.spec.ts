import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import type { BorradorRegistro } from './borrador.service';
import { BorradorService } from './borrador.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('BorradorService (R8)', () => {
  let service: BorradorService;

  const mockBorrador: Omit<BorradorRegistro, 'fechaGuardado'> = {
    tipo: 'bache',
    descripcion: 'Bache con agua acumulada',
    direccion: 'Av. América y Diguja',
    sector: 'Mariscal Sucre',
    prioridad: 'alta',
    foto: 'data:image/jpeg;base64,data',
    lat: -0.19,
    lon: -78.49,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BorradorService],
    });
    service = TestBed.inject(BorradorService);
    vi.clearAllMocks();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('guarda el borrador en Preferences con clave urbaninspect_borrador_registro', async () => {
    await service.guardarBorrador(mockBorrador);

    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'urbaninspect_borrador_registro',
      value: expect.stringContaining('Bache con agua acumulada'),
    });
  });

  it('recupera el borrador almacenado si contiene datos sustanciales', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify({
        ...mockBorrador,
        fechaGuardado: '2026-10-28T14:30:00Z',
      }),
    });

    const recuperado = await service.obtenerBorrador();
    expect(recuperado).toBeTruthy();
    expect(recuperado?.descripcion).toBe('Bache con agua acumulada');
  });

  it('devuelve null si no existe borrador o no contiene datos sustanciales', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    const res1 = await service.obtenerBorrador();
    expect(res1).toBeNull();

    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify({
        tipo: 'luminaria',
        descripcion: '',
        direccion: '',
        sector: 'Centro Histórico',
        prioridad: 'media',
        foto: null,
        lat: null,
        lon: null,
        fechaGuardado: '2026-10-28T14:30:00Z',
      }),
    });
    const res2 = await service.obtenerBorrador();
    expect(res2).toBeNull();
  });

  it('elimina el borrador de Preferences', async () => {
    await service.eliminarBorrador();
    expect(Preferences.remove).toHaveBeenCalledWith({
      key: 'urbaninspect_borrador_registro',
    });
  });
});
