// Extrae geometrías de los HTML de Medianoche (docs/diseno/medianoche/) y genera archivos TS:
//   src/componentes/iconos/trazos.ts   — 20 iconos (contorno) + 9 capas duotono
//   src/componentes/avatar/relieves.ts — 6 relieves de avatar (curvas de nivel, retícula 48)
//   src/componentes/motivo/curvas.ts   — motivo de curvas de nivel de la cabecera (360 × 420)
// Uso (una sola vez, o si cambia el diseño): node scripts/extraer-diseno.js
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const leer = (archivo) =>
  fs.readFileSync(path.join(raiz, 'docs/diseno/medianoche', archivo), 'utf8');
const escribir = (archivo, contenido) => {
  fs.mkdirSync(path.dirname(path.join(raiz, archivo)), { recursive: true });
  fs.writeFileSync(path.join(raiz, archivo), contenido);
  console.log('escrito', archivo, contenido.length, 'caracteres');
};
const redondear = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
const listaTs = (items, sangria) => items.map((d) => `${sangria}'${d}',`).join('\n');

const componentes = leer('A_Componentes.dc.html');

// ---------- Iconos ----------
const CLAVES = {
  Panel: 'panel',
  Inmuebles: 'inmuebles',
  Contratos: 'contratos',
  Pagos: 'pagos',
  Más: 'mas',
  Comprobante: 'comprobante',
  Cámara: 'camara',
  Documento: 'documento',
  Descarga: 'descarga',
  Compartir: 'compartir',
  Mantenimiento: 'mantenimiento',
  Alerta: 'alerta',
  Calendario: 'calendario',
  Filtro: 'filtro',
  Atrás: 'atras',
  Buscar: 'buscar',
  Aprobar: 'aprobar',
  Rechazar: 'rechazar',
  Añadir: 'anadir',
  Perfil: 'perfil',
};
{
  const ini = componentes.indexOf('>Iconos RentCheck<');
  const seccion = componentes.slice(ini, componentes.indexOf('Retícula 24', ini));
  const re =
    /<svg width="28" height="28"[^>]*>(.*?)<\/svg>(?:<\/span><span[^>]*>([^<]+)<\/span>)?/g;
  const contorno = [];
  const duotono = [];
  let m;
  while ((m = re.exec(seccion))) {
    const paths = [...m[1].matchAll(/<path d="([^"]+)"( fill="#B7E35A")?/g)].map((x) => ({
      d: x[1],
      relleno: !!x[2],
    }));
    if (m[2]) contorno.push({ nombre: m[2], trazos: paths.map((p) => p.d) });
    else
      duotono.push({
        relleno: paths.filter((p) => p.relleno).map((p) => p.d),
        trazos: paths.filter((p) => !p.relleno).map((p) => p.d),
      });
  }
  if (contorno.length !== 20 || duotono.length !== 9)
    throw new Error(`Se esperaban 20 + 9 iconos: ${contorno.length} + ${duotono.length}`);

  let ts = `// Generado por scripts/extraer-diseno.js — no editar a mano.
// Trazos de los 20 iconos propios de Medianoche (retícula 24, trazo 1,65; duotono 1,75).
// \`relleno\` es la segunda capa lima de la versión duotono; solo la tienen los 9 iconos que el
// diseño define en duotono.

export interface TrazoIcono {
  trazos: readonly string[];
  relleno?: readonly string[];
}

export const TRAZOS_ICONOS = {
`;
  for (const c of contorno) {
    const d = duotono.find((x) => JSON.stringify(x.trazos) === JSON.stringify(c.trazos));
    ts += `  ${CLAVES[c.nombre]}: {\n    trazos: [\n${listaTs(c.trazos, '      ')}\n    ],\n`;
    if (d) ts += `    relleno: [\n${listaTs(d.relleno, '      ')}\n    ],\n`;
    ts += '  },\n';
  }
  ts += `  // Fuera de la hoja de 20: chevron de las filas de lista (pantalla Panel del diseño).
  adelante: {
    trazos: ['M9.5 5.5L16 12l-6.5 6.5'],
  },
} as const satisfies Record<string, TrazoIcono>;

export type NombreIcono = keyof typeof TRAZOS_ICONOS;
`;
  escribir('src/componentes/iconos/trazos.ts', ts);
}

// ---------- Relieves de avatar ----------
{
  const re =
    /<span role="img" aria-label="([^"]+)" style="[^"]*width: 48px[^"]*radial-gradient\(circle at (\d+)% (\d+)%, (#[0-9A-F]+) 0%, (#[0-9A-F]+) 85%\)[^"]*"><svg[^>]*stroke="(#[0-9A-F]+)"[^>]*>(.*?)<\/svg><span style="position: absolute; left: ([\d.]+)px; top: ([\d.]+)px/g;
  const formas = [];
  const tonos = [];
  let m;
  while ((m = re.exec(componentes))) {
    const curvas = [...m[7].matchAll(/d="([^"]+)"/g)].map((x) => redondear(x[1]));
    // El punto del pico mide 5 × 5: su centro es esquina + 2,5.
    formas.push({ pico: [Number(m[8]) + 2.5, Number(m[9]) + 2.5], curvas });
    tonos.push({ centro: m[4], borde: m[5], linea: m[6] });
  }
  if (formas.length !== 6) throw new Error(`Se esperaban 6 relieves: ${formas.length}`);

  let ts = `// Generado por scripts/extraer-diseno.js — no editar a mano.
// Los 6 relieves de avatar de la hoja de componentes (retícula 48 × 48) y sus 6 tonos.
// AvatarRelieve obtiene 12 variantes fijas: estas 6 formas y las mismas giradas 180°.

export interface FormaRelieve {
  /** Centro del punto luminoso (cima del relieve), en la retícula 48. */
  pico: readonly [number, number];
  curvas: readonly string[];
}

export interface TonoRelieve {
  centro: string;
  borde: string;
  linea: string;
}

export const FORMAS_RELIEVE: readonly FormaRelieve[] = [
`;
  for (const f of formas) {
    ts += `  {\n    pico: [${f.pico.map((n) => Math.round(n * 10) / 10).join(', ')}],\n    curvas: [\n${listaTs(f.curvas, '      ')}\n    ],\n  },\n`;
  }
  ts += `];

export const TONOS_RELIEVE: readonly TonoRelieve[] = [
${tonos.map((t) => `  { centro: '${t.centro}', borde: '${t.borde}', linea: '${t.linea}' },`).join('\n')}
];
`;
  escribir('src/componentes/avatar/relieves.ts', ts);
}

// ---------- Motivo de curvas de nivel (cabecera) ----------
{
  const panel = leer('A_Panel.dc.html');
  const ini = panel.indexOf('<svg width="360" height="420"');
  const svg = panel.slice(ini, panel.indexOf('</svg>', ini));
  const curvas = [...svg.matchAll(/d="([^"]+)"/g)].map((x) => redondear(x[1]));
  let ts = `// Generado por scripts/extraer-diseno.js — no editar a mano.
// Motivo de curvas de nivel de la cabecera de tinta (pantalla Panel), retícula 360 × 420.

export const ANCHO_MOTIVO = 360;
export const ALTO_MOTIVO = 420;

export const CURVAS_MOTIVO: readonly string[] = [
${listaTs(curvas, '  ')}
];
`;
  escribir('src/componentes/motivo/curvas.ts', ts);
}
