// Entorno de producción (`ng build --configuration production`).
// Reemplaza a environment.ts cuando se compila para despliegue o para la app nativa Android.

export const environment = {
  production: true,

  /** URL base del recurso de MockAPI (API de oficina simulada). No es un secreto.
   * El recurso se llama `API` porque el plan gratuito no permite renombrarlo tras
   * crearlo; cumple el papel del recurso `incidencias` del enunciado (decisión
   * documentada en el README). */
  incidenciasApiUrl: 'https://6ae2831abbb541292299fd5e.mockapi.io/API',

  /** API meteorológica externa REAL (sin clave, CORS `*`). */
  climaApiUrl: 'https://api.open-meteo.com/v1/forecast',

  /** Registros por petición: la paginación es REMOTA (R3). 26 sembrados / 10 = 3 páginas. */
  pageSize: 10,

  /** Almacenamiento externo de imágenes en Cloudinary (R6) con fallback a Base64 */
  cloudinary: {
    cloudName: 'btmr3o2b',
    apiKey: '981412624132498',
    apiSecret: 'Mfv5sy_t6KO9CwruqsIDDb7totA',
  },
};
