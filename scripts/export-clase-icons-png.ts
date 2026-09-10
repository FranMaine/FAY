// Regenera los logos de categoría (public/logos-categorias/*.png) a partir
// de las mismas formas que usa src/components/icons/clase-icons.tsx. Correr
// con `pnpm exec tsx scripts/export-clase-icons-png.ts` después de tocar el
// diseño de algún ícono ahí, para que el PNG exportado quede igual al que
// se ve en el sitio.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const COLOR = '#3B82F6';
const SIZE = 512;
const CIRCLE = `<circle cx="50" cy="50" r="45" stroke="${COLOR}" stroke-width="5" fill="none" />`;

function wordmark(texto: string, fontSize: number) {
  return `<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" fill="${COLOR}" letter-spacing="-1">${texto}</text>`;
}

const ICONOS: Record<string, string> = {
  '29er': wordmark('29ER', 26),
  '420': wordmark('420', 32),
  f18: wordmark('F18', 32),
  ilca: wordmark('ILCA', 24),
  j24: wordmark('J24', 30),
  j70: wordmark('J70', 30),
  optimist: `<g transform="translate(20,19) scale(2.5)" stroke="${COLOR}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M10 2v15" />
    <path d="M7 22a4 4 0 0 1-4-4 1 1 0 0 1 1-1h16a1 1 0 0 1 1 1 4 4 0 0 1-4 4z" />
    <path d="M9.159 2.46a1 1 0 0 1 1.521-.193l9.977 8.98A1 1 0 0 1 20 13H4a1 1 0 0 1-.824-1.567z" />
  </g>`,
  raptor: `<g stroke="${COLOR}" stroke-width="7" stroke-linecap="round">
    <line x1="32" y1="25" x2="45" y2="78" />
    <line x1="47" y1="22" x2="60" y2="78" />
    <line x1="62" y1="25" x2="75" y2="78" />
  </g>`,
  snipe: `<path d="M16 58 Q33 36 50 50 Q67 36 84 58" stroke="${COLOR}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />`,
  star: `<path d="M50,20 57.05,40.29 78.53,40.73 61.41,53.71 67.63,74.27 50,62 32.37,74.27 38.59,53.71 21.47,40.73 42.95,40.29Z" fill="${COLOR}" />`,
};

async function main() {
  const outDir = path.resolve('public/logos-categorias');
  fs.mkdirSync(outDir, { recursive: true });

  for (const [slug, contenido] of Object.entries(ICONOS)) {
    const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${CIRCLE}${contenido}</svg>`;
    const destino = path.join(outDir, `${slug}.png`);
    await sharp(Buffer.from(svg), { density: 300 })
      .resize(SIZE, SIZE)
      .png()
      .toFile(destino);
    console.log('OK', destino);
  }
}

main();
