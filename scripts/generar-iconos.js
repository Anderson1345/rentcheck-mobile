// Genera el ícono y el splash de la app a partir de assets/fuente/marca.svg.
// Uso (una sola vez, o si cambia la marca): node scripts/generar-iconos.js
// sharp es devDependency solo para este script; la app no lo usa.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const raiz = path.join(__dirname, '..');
const fuente = fs.readFileSync(path.join(raiz, 'assets/fuente/marca.svg'), 'utf8');
const salida = (nombre) => path.join(raiz, 'assets/images', nombre);
const LADO = 1024;

/** Quita del SVG las capas indicadas (por id). */
function sinCapas(svg, ids) {
  return ids.reduce(
    (s, id) =>
      s.replace(
        new RegExp(`\\s*<g id="${id}"[\\s\\S]*?</g>|\\s*<(?:rect|circle) id="${id}"[^>]*/>`),
        '',
      ),
    svg,
  );
}

/** Pinta de un solo color (blanco) curvas y cima, para el ícono monocromo de Android. */
function monocromo(svg) {
  return svg.replace(/#C5F06A/g, '#FFFFFF').replace('stroke-opacity="0.55"', 'stroke-opacity="1"');
}

/** Recorta la marca en un círculo (el borde del degradado es tinta: se funde con el fondo). */
function medallon(svg) {
  return svg
    .replace('r="40.8"', 'r="22"')
    .replace(
      '</defs>',
      '  <clipPath id="circulo"><circle cx="24" cy="24" r="22"/></clipPath>\n  </defs>\n  <g clip-path="url(#circulo)">',
    )
    .replace('</svg>', '</g>\n</svg>');
}

async function png(svg, archivo, lado = LADO) {
  // El SVG fuente mide 1024 × 1024: se rasteriza a ese tamaño y se reduce si hace falta.
  await sharp(Buffer.from(svg))
    .resize(lado, lado)
    .png({ compressionLevel: 9 })
    .toFile(salida(archivo));
  console.log('generado', archivo);
}

async function main() {
  // Ícono completo (iOS, tiendas y lanzadores sin ícono adaptativo).
  await png(fuente, 'icon.png');
  // Ícono adaptativo de Android: fondo (degradado) y frente (curvas y cima) por separado.
  await png(sinCapas(fuente, ['curvas', 'halo', 'cima']), 'android-icon-background.png');
  await png(sinCapas(fuente, ['fondo']), 'android-icon-foreground.png');
  await png(monocromo(sinCapas(fuente, ['fondo', 'halo'])), 'android-icon-monochrome.png');
  // Splash: medallón circular sobre fondo de tinta (app.json → expo-splash-screen).
  await png(medallon(fuente), 'splash-icon.png', 512);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
