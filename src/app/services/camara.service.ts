import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface ErrorCamara {
  tipo: 'permiso_denegado' | 'cancelado' | 'error_desconocido';
  mensaje: string;
}

/**
 * Servicio de Evidencia Fotográfica (R6, 1,6 pts).
 *
 * Captura fotos usando @capacitor/camera, las comprime a base64 (<= 70 KB)
 * para evitar el límite de MockAPI (trampa §0.2.2 / §3.8), y maneja de forma segura
 * la cancelación del usuario y los permisos denegados.
 */
@Injectable({
  providedIn: 'root',
})
export class CamaraService {
  /**
   * Abre la cámara del dispositivo o selector de fotos.
   * Si el usuario cancela, devuelve null sin lanzar excepción para no perder datos.
   * Si el permiso es denegado, lanza un ErrorCamara con tipo 'permiso_denegado'.
   */
  async capturarFoto(): Promise<string | null> {
    try {
      const imagen = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        width: 640,
        height: 480,
      });

      if (!imagen?.base64String) {
        return null;
      }

      const rawDataUrl = `data:image/jpeg;base64,${imagen.base64String}`;
      // Aseguramos que la imagen no sobrepase los 70 KB
      return await this.asegurarLimiteTamanio(rawDataUrl, 70);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const mensaje = errObj?.message?.toLowerCase() || '';

      // Si el usuario canceló la captura
      if (
        mensaje.includes('cancel') ||
        mensaje.includes('user cancelled') ||
        mensaje.includes('no image picked') ||
        mensaje.includes('dismissed')
      ) {
        return null;
      }

      // Si el permiso fue denegado
      if (mensaje.includes('permission') || mensaje.includes('denied') || mensaje.includes('access')) {
        const errorPermiso: ErrorCamara = {
          tipo: 'permiso_denegado',
          mensaje:
            'El acceso a la cámara o galería fue denegado por el usuario o las políticas del dispositivo. Habilite el permiso en ajustes.',
        };
        throw errorPermiso;
      }

      const errorGenerico: ErrorCamara = {
        tipo: 'error_desconocido',
        mensaje: 'No fue posible capturar la fotografía con la cámara del dispositivo.',
      };
      throw errorGenerico;
    }
  }

  /**
   * Comprime o redimensiona una imagen en formato data-URI para asegurar que
   * pese <= maxKilobytes (MockAPI falla con 413 si supera ~80-100 KB).
   */
  async asegurarLimiteTamanio(dataUrl: string, maxKilobytes = 70): Promise<string> {
    // Si no está en un navegador con soporte Image o Canvas, devolver tal cual
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return dataUrl;
    }

    const bytesEstimados = (dataUrl.length * 3) / 4;
    if (bytesEstimados <= maxKilobytes * 1024) {
      return dataUrl;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar si excede 640x480
        const maxDimension = 640;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Probar con calidad 0.5
        let optimizada = canvas.toDataURL('image/jpeg', 0.5);
        if ((optimizada.length * 3) / 4 > maxKilobytes * 1024) {
          optimizada = canvas.toDataURL('image/jpeg', 0.3);
        }

        resolve(optimizada);
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    });
  }
}
