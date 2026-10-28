/**
 * Contrato de datos de UrbanInspect (creado en la fase B por 🟦 MiMo como base compartida).
 *
 * Los `valor` son EXACTAMENTE los que se escriben en el recurso `incidencias` de MockAPI
 * (el PDF prohíbe inventar estados/tipos fuera del modelo). Las `etiqueta` son lo que se
 * muestra en pantalla (con acentos y en mayúscula), nunca lo que viaja por la red.
 */

export type TipoIncidencia = 'luminaria' | 'bache' | 'senalizacion' | 'alcantarilla' | 'parque';

export type EstadoIncidencia = 'pendiente' | 'en_proceso' | 'resuelta';

export type PrioridadIncidencia = 'baja' | 'media' | 'alta';

/** Registro tal y como lo devuelve/devuelve la API de oficina (MockAPI). */
export interface Incidencia {
  /** `id` autoincremental de MockAPI → el código mostrado es `INC-<id>`. */
  id: string | number;
  tipo: TipoIncidencia;
  descripcion: string;
  direccion: string;
  sector: string;
  /** ISO 8601. */
  fecha: string;
  estado: EstadoIncidencia;
  prioridad: PrioridadIncidencia;
  /** URL devuelta por el campo `File` de MockAPI; vacía/null si no hay foto. */
  foto?: string | null;
  lat?: number | null;
  lon?: number | null;
  /** Obligatoria para pasar a `resuelta` (R9). */
  observacion?: string | null;
}

export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
  /** Nombre de ionicon (se registra en `main.ts` con `addIcons()`, trampa 3.14). */
  icono: string;
}

export const TIPOS: Opcion<TipoIncidencia>[] = [
  { valor: 'luminaria', etiqueta: 'Luminaria dañada', icono: 'bulb-outline' },
  { valor: 'bache', etiqueta: 'Bache', icono: 'warning-outline' },
  { valor: 'senalizacion', etiqueta: 'Señalización', icono: 'signpost-outline' },
  { valor: 'alcantarilla', etiqueta: 'Alcantarilla', icono: 'water-outline' },
  { valor: 'parque', etiqueta: 'Daño en parque', icono: 'tree-outline' },
];

/** Orden de transición permitido (R9): pendiente → en proceso → resuelta. */
export const ESTADOS: Opcion<EstadoIncidencia>[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente', icono: 'time-outline' },
  { valor: 'en_proceso', etiqueta: 'En proceso', icono: 'construct-outline' },
  { valor: 'resuelta', etiqueta: 'Resuelta', icono: 'checkmark-circle-outline' },
];

export const PRIORIDADES: Opcion<PrioridadIncidencia>[] = [
  { valor: 'baja', etiqueta: 'Baja', icono: 'arrow-down-circle-outline' },
  { valor: 'media', etiqueta: 'Media', icono: 'remove-circle-outline' },
  { valor: 'alta', etiqueta: 'Alta', icono: 'alert-circle-outline' },
];

/** Código visible del listado y de las notificaciones: `INC-7`. */
export const codigoDe = (incidencia: Pick<Incidencia, 'id'>): string => `INC-${incidencia.id}`;

export const esBache = (incidencia: Pick<Incidencia, 'tipo'>): boolean => incidencia.tipo === 'bache';

export const prioridadExigeFoto = (prioridad: PrioridadIncidencia): boolean => prioridad === 'alta';

/**
 * Transiciones de estado válidas (R9). Una `resuelta` no vuelve atrás.
 */
export const SIGUIENTE_ESTADO: Record<EstadoIncidencia, EstadoIncidencia | null> = {
  pendiente: 'en_proceso',
  en_proceso: 'resuelta',
  resuelta: null,
};
