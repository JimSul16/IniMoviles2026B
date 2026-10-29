import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

/**
 * Servicio de Almacenamiento Externo en Cloudinary (R6).
 *
 * Permite subir evidencias fotográficas a Cloudinary mediante firma criptográfica SHA-1 (Web Crypto API)
 * para almacenar URLs cortas y CDN en MockAPI. Si la subida externa no está disponible o falla,
 * la aplicación realiza fallback seguro a Base64 comprimido.
 */
@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private readonly http = inject(HttpClient, { optional: true });

  private readonly cloudName = environment.cloudinary?.cloudName ?? 'btmr3o2b';
  private readonly apiKey = environment.cloudinary?.apiKey ?? '981412624132498';
  private readonly apiSecret = environment.cloudinary?.apiSecret ?? 'Mfv5sy_t6KO9CwruqsIDDb7totA';

  /**
   * Genera la firma SHA-1 requerida por Cloudinary usando la Web Crypto API nativa.
   */
  async generarFirmaSha1(cadena: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto?.subtle?.digest) {
      const msgUint8 = new TextEncoder().encode(cadena);
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback para entornos de prueba donde crypto.subtle no esté disponible
    return 'fallback_signature';
  }

  /**
   * Sube una imagen en formato data-URI a Cloudinary y retorna la secure_url.
   * Si la subida falla o supera el tiempo límite, retorna null para activar el respaldo en Base64.
   */
  async subirImagen(dataUrl: string): Promise<string | null> {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return dataUrl || null;
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const strToSign = `timestamp=${timestamp}${this.apiSecret}`;
      const signature = await this.generarFirmaSha1(strToSign);

      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

      if (this.http) {
        const respuesta = await firstValueFrom(
          this.http.post<CloudinaryUploadResponse>(url, formData).pipe(timeout(10000)),
        );
        return respuesta?.secure_url ?? null;
      }

      // Fallback nativo fetch si HttpClient no está presente
      const respuesta = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!respuesta.ok) {
        return null;
      }

      const datos = (await respuesta.json()) as CloudinaryUploadResponse;
      return datos?.secure_url ?? null;
    } catch {
      // Ante cualquier excepción de red o límite, retorna null para usar Base64 como respaldo
      return null;
    }
  }
}
