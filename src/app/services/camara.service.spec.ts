import { TestBed } from '@angular/core/testing';
import { Camera } from '@capacitor/camera';

import { CamaraService } from './camara.service';

vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    Uri: 'uri',
    Base64: 'base64',
    DataUrl: 'dataUrl',
  },
  CameraSource: {
    Prompt: 'PROMPT',
    Camera: 'CAMERA',
    Photos: 'PHOTOS',
  },
}));

describe('CamaraService (R6)', () => {
  let service: CamaraService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CamaraService],
    });
    service = TestBed.inject(CamaraService);
    vi.clearAllMocks();
  });

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('devuelve data-URI base64 cuando la cámara captura exitosamente', async () => {
    vi.mocked(Camera.getPhoto).mockResolvedValue({
      base64String: 'testBase64StringData',
      format: 'jpeg',
    } as any);

    const resultado = await service.capturarFoto();
    expect(resultado).toBe('data:image/jpeg;base64,testBase64StringData');
  });

  it('devuelve null y NO lanza error si el usuario cancela la captura (datos intactos)', async () => {
    vi.mocked(Camera.getPhoto).mockRejectedValue(new Error('User cancelled photos app'));

    const resultado = await service.capturarFoto();
    expect(resultado).toBeNull();
  });

  it('lanza error de permiso_denegado cuando el acceso a la cámara es denegado', async () => {
    vi.mocked(Camera.getPhoto).mockRejectedValue(new Error('Permission denied by user'));

    await expect(service.capturarFoto()).rejects.toMatchObject({
      tipo: 'permiso_denegado',
      mensaje: expect.stringContaining('denegado'),
    });
  });
});
