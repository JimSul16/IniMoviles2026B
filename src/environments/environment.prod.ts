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
};
