import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { CLAVE_SEGUIMIENTO, SeguimientoService } from './seguimiento.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('SeguimientoService (R1)', () => {
  let service: SeguimientoService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(Preferences.remove).mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [SeguimientoService],
    });
    service = TestBed.inject(SeguimientoService);
  });

  it('se crea correctamente con conjunto de IDs vacío por defecto', () => {
    expect(service).toBeTruthy();
    expect(service.idsSeguimiento().size).toBe(0);
  });

  it('recupera la lista persistente de IDs desde Preferences (R1)', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify(['1', '5', '12']),
    });

    const ids = await service.cargarIds();

    expect(Preferences.get).toHaveBeenCalledWith({ key: CLAVE_SEGUIMIENTO });
    expect(ids).toEqual(['1', '5', '12']);
    expect(service.estaEnSeguimiento('1')).toBe(true);
    expect(service.estaEnSeguimiento('5')).toBe(true);
    expect(service.estaEnSeguimiento('12')).toBe(true);
    expect(service.estaEnSeguimiento('99')).toBe(false);
  });

  it('alterna el seguimiento agregando cuando no existe y persistiendo en Preferences (R1)', async () => {
    const nuevoEstado = await service.alternarSeguimiento('7');

    expect(nuevoEstado).toBe(true);
    expect(service.estaEnSeguimiento('7')).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: CLAVE_SEGUIMIENTO,
      value: JSON.stringify(['7']),
    });
  });

  it('alterna el seguimiento quitando cuando ya existe y actualizando Preferences (R1)', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify(['7', '14']),
    });
    await service.cargarIds();

    const nuevoEstado = await service.alternarSeguimiento('7');

    expect(nuevoEstado).toBe(false);
    expect(service.estaEnSeguimiento('7')).toBe(false);
    expect(service.estaEnSeguimiento('14')).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: CLAVE_SEGUIMIENTO,
      value: JSON.stringify(['14']),
    });
  });

  it('desmarcar elimina el ID especificado sin alterar los demás (R1)', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify(['3', '9']),
    });
    await service.cargarIds();

    await service.desmarcar('3');

    expect(service.estaEnSeguimiento('3')).toBe(false);
    expect(service.estaEnSeguimiento('9')).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: CLAVE_SEGUIMIENTO,
      value: JSON.stringify(['9']),
    });
  });

  it('maneja datos corruptos en Preferences retornando conjunto vacío sin lanzar excepción', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: '{ json_invalido: ',
    });

    const ids = await service.cargarIds();

    expect(ids).toEqual([]);
    expect(service.idsSeguimiento().size).toBe(0);
  });
});
