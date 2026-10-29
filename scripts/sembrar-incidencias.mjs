/**
 * Siembra de datos de prueba — UrbanInspect.
 *
 * Uso:
 *   node scripts/sembrar-incidencias.mjs            # siembra26 incidencias
 *   node scripts/sembrar-incidencias.mjs --limpiar  # borra todo lo que haya y vuelve a sembrar
 *
 * Por qué existe este script (y no un "Reset all" de MockAPI):
 *  · el PDF exige "suficientes incidencias para demostrar al menos tres páginas de
 *    resultados, los tres estados y varios tipos/prioridades" →26 registros con
 *    PAGE_SIZE 10 dan 3 páginas (10 + 10 + 6);
 *  · MockAPI no tiene carga masiva: cada registro es un POST y consume cuota, así
 *    que la siembra se hace UNA vez, desde infraestructura, y queda documentada;
 *  · las fotos son PNG pequeños generados aquí (2-12 KB) para poder mostrar
 *    "fotografía (si existe)" en el listado y en el detalle sin depender de nadie.
 *
 * El límite de payload del plan gratuito es ~100 KB (se probó: 117 KB → 413), por
 * eso las fotos de la app se comprimen a ≤ 70 KB de base64 y las de la siembra
 * son PNG de pocos KB.
 */

import zlib from 'node:zlib';

const BASE = process.env.INCIDENCIAS_API_URL ?? 'https://6ae2831abbb541292299fd5e.mockapi.io/API';
const TOTAL = 26;
const LIMPIAR = process.argv.includes('--limpiar');

/* ------------------------------------------------------------------ *
 * PNG mínimo (RGB, sin dependencias) para las fotos de la siembra.
 * ------------------------------------------------------------------ */
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const crc32 = (buffer) => zlib.crc32(buffer) >>> 0;

const chunk = (tipo, data) => {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(data.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
};

/** PNG con degradado horizontal entre dos colores y borde más oscuro. */
const pngDegradado = (ancho, alto, [r1, g1, b1], [r2, g2, b2]) => {
  const filas = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3);
    fila[0] = 0; // filtro: None
    for (let x = 0; x < ancho; x++) {
      const t = x / (ancho - 1);
      const borde = x < 3 || y < 3 || x >= ancho - 3 || y >= alto - 3;
      const i = 1 + x * 3;
      fila[i] = borde ? 26 : Math.round(r1 + (r2 - r1) * t);
      fila[i + 1] = borde ? 26 : Math.round(g1 + (g2 - g1) * t);
      fila[i + 2] = borde ? 26 : Math.round(b1 + (b2 - b1) * t);
    }
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const png = Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(filas), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
};

const PALETA = {
  luminaria: [[255, 196, 0], [92, 64, 0]],
  bache: [[141, 110, 99], [44, 32, 28]],
  senalizacion: [[66, 165, 245], [13, 52, 83]],
  alcantarilla: [[38, 198, 218], [0, 63, 72]],
  parque: [[102, 187, 106], [27, 71, 32]],
};

const fotoDe = (tipo) => {
  const [a, b] = PALETA[tipo] ?? PALETA.luminaria;
  return pngDegradado(160, 120, a, b);
};

/* ------------------------------------------------------------------ *
 * Datos: sectores reales de Quito con coordenadas verosímiles.
 * ------------------------------------------------------------------ */
const SECTORES = [
  { sector: 'Centro Histórico', lat: -0.2201, lon: -78.5123 },
  { sector: 'La Marín', lat: -0.2144, lon: -78.5272 },
  { sector: 'San Roque', lat: -0.2333, lon: -78.5217 },
  { sector: 'Cotocollao', lat: -0.1703, lon: -78.4875 },
  { sector: 'Conocoto', lat: -0.2739, lon: -78.4378 },
  { sector: 'Guamaní', lat: -0.2767, lon: -78.5208 },
  { sector: 'Bellavista', lat: -0.1947, lon: -78.5064 },
  { sector: 'Calderón', lat: -0.1333, lon: -78.4833 },
  { sector: 'Solanda', lat: -0.2819, lon: -78.5097 },
  { sector: 'La Floresta', lat: -0.2086, lon: -78.5075 },
];

const CALLES = [
  'Av. República y Guayaquil',
  'Calle Venezuela y Baquerizo',
  'Av. 10 de Agosto y Naciones Unidas',
  'Calle Larga y Chile',
  'Av. Amazonas y Atahualpa',
  'Calle García Moreno y Pichincha',
  'Av. Eloy Alfaro y Naciones Unidas',
  'Calle Cordero y Baca',
  'Av. Simón Bolívar y Naciones Unidas',
  'Calle Rocafuerte y Esmeraldas',
  'Av. Mariscal Sucre y Paul',
  'Calle Ambáte y Santa María',
];

const DESCRIPCIONES = {
  luminaria: [
    'Luminaria apagada, la calle queda a oscuras toda la noche',
    'Poste con la lámpara reventada y el cable expuesto',
    'Luminaria intermitente que no enciende desde hace varios días',
    'Luminaria inclinada tras el paso de un vehículo',
  ],
  bache: [
    'Bache profundo que obliga a frenar en seco',
    'Bache junto al canal que se está ensanchando con la lluvia',
    'Varios baches en la misma cuadra, la calle está picada',
    'Bache en el carril central, difícil de ver de noche',
  ],
  senalizacion: [
    'Señal de tránsito caída y apoyada en la vereda',
    'Létrica de la calle desprendida del poste',
    'Semáforo peatonal sin funcionar',
    'Señal vertical doblada, no se lee la indicación',
  ],
  alcantarilla: [
    'Alcantarilla sin tapa, peligro para peatones',
    'Alcantarilla obstruida, el agua se acumula en la esquina',
    'Rejilla deformada que hace ruido con cada carro',
    'Alcantarilla desbordada tras las últimas lluvias',
  ],
  parque: [
    'Banco del parque roto con tablones sueltos',
    'Juego infantil con tornillos expuestos',
    'Alumbrado del parque apagado',
    'Cancha con el balón de mano suelto y la malla rota',
  ],
};

const ESTADOS = ['pendiente', 'en_proceso', 'resuelta'];
const PRIORIDADES = ['baja', 'media', 'alta'];
const TIPOS = Object.keys(PALETA);

const OBSERVACIONES = [
  'Se coordinó con mantenimiento para la próxima semana.',
  'Material solicitado a la bodega municipal.',
  'Se retiró el escombro; falta repintar la señal.',
  'Inspección nocturna confirma el arreglo.',
];

const construirIncidencia = (n) => {
  const tipo = TIPOS[n % TIPOS.length];
  const { sector, lat, lon } = SECTORES[n % SECTORES.length];
  const estado = ESTADOS[n % ESTADOS.length];
  const prioridad = PRIORIDADES[n % PRIORIDADES.length];
  const dia = 1 + (n % 27);
  const hora = 8 + (n % 10);
  const conFoto = n % 3 !== 0; //2 de cada 3 tienen foto
  const resuelta = estado === 'resuelta';

  return {
    tipo,
    descripcion: DESCRIPCIONES[tipo][n % DESCRIPCIONES[tipo].length],
    direccion: CALLES[n % CALLES.length],
    sector,
    fecha: `2026-10-${String(dia).padStart(2, '0')}T${String(hora).padStart(2, '0')}:30:00`,
    estado,
    prioridad,
    foto: conFoto ? fotoDe(tipo) : '',
    lat: Number((lat + (n % 5) * 0.0007).toFixed(4)),
    lon: Number((lon + (n % 5) * 0.0007).toFixed(4)),
    observacion: resuelta ? OBSERVACIONES[n % OBSERVACIONES.length] : '',
  };
};

/* ------------------------------------------------------------------ *
 * Ejecución
 * ------------------------------------------------------------------ */
const json = (r) => (r.status === 204 ? null : r.json());

const obtenerTodo = async () => {
  const pagina = async (n) =>
    json(await fetch(`${BASE}?page=${n}&limit=50`, { headers: { Origin: 'http://localhost:4200' } }));
  const salida = [];
  for (let n = 1; n <= 10; n++) {
    const lote = await pagina(n);
    if (!Array.isArray(lote) || lote.length === 0) break;
    salida.push(...lote);
    if (lote.length < 50) break;
  }
  return salida;
};

const main = async () => {
  console.log(`Recurso: ${BASE}`);
  const existentes = await obtenerTodo();

  if (existentes.length > 0 && !LIMPIAR) {
    console.error(
      `\nHay ${existentes.length} registros. Para no borrar datos ajenos NO se siembra.\n` +
        'Si quieres reemplazarlos:  node scripts/sembrar-incidencias.mjs --limpiar',
    );
    process.exit(1);
  }

  for (const registro of existentes) {
    const r = await fetch(`${BASE}/${registro.id}`, { method: 'DELETE' });
    if (r.status >= 300) {
      console.error(`No se pudo borrar el registro ${registro.id} (HTTP ${r.status}).`);
      process.exit(1);
    }
  }
  if (existentes.length > 0) console.log(`Borrados ${existentes.length} registros previos.`);

  let creados = 0;
  for (let n = 0; n < TOTAL; n++) {
    const incidencia = construirIncidencia(n);
    const respuesta = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incidencia),
    });

    if (respuesta.status === 429) {
      console.error(
        '\nCuota de MockAPI agotada (429). Espera a que se reinicie la ventana horaria y\n' +
          'vuelve a lanzar el script: continuaría dejando los registros ya creados.',
      );
      process.exit(1);
    }
    if (respuesta.status !== 201) {
      console.error(`Registro ${n + 1} → HTTP ${respuesta.status}: ${await respuesta.text()}`);
      process.exit(1);
    }
    creados++;
    const cuerpo = await respuesta.json();
    console.log(
      `  ✔ INC-${cuerpo.id}  ${incidencia.tipo.padEnd(13)} ${incidencia.estado.padEnd(11)} ` +
        `${incidencia.prioridad.padEnd(5)} ${incidencia.sector} ${incidencia.foto ? '(con foto)' : ''}`,
    );
  }

  const finales = await obtenerTodo();
  console.log(`\nListo: ${creados} creados · ${finales.length} en total · ${Math.ceil(finales.length / 10)} páginas con PAGE_SIZE 10.`);
};

main().catch((error) => {
  console.error('ERROR', error.message);
  process.exit(1);
});
