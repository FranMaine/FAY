// Procesa los logos reales subidos por el usuario: recorta el margen
// blanco, y recolorea cada trazo a #3B82F6 con transparencia real -el
// truco es usar el brillo (luminancia) de cada píxel como canal alfa: un
// trazo oscuro sobre fondo claro se vuelve opaco y celeste, el fondo
// blanco se vuelve 100% transparente. Funciona igual de bien para el PNG
// ya celeste (29er, 420, etc.) que para el JPG en negro sobre blanco
// (raptor.jpg) -no importa el color original, solo qué tan oscuro es.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const COLOR = { r: 0x3b, g: 0x82, b: 0xf6 };
const SIZE = 512;
const PADDING = 40; // margen dentro del lienzo cuadrado final

const ARCHIVOS: Record<string, string> = {
  '29er': 'logos/29er.png',
  '420': 'logos/420.png',
  f18: 'logos/F18.png',
  ilca: 'logos/ILCA.png',
  j24: 'logos/J24.png',
  j70: 'logos/J70.png',
  optimist: 'logos/Optimist.png',
  raptor: 'logos/raptor.jpg',
  snipe: 'logos/SNIPE.png',
  star: 'logos/STAR.png',
};

// raptor.jpg es un JPG con textura de papel de fondo (no blanco puro:
// luminancia ~237-246, contra ~250-255 de los PNG con fondo blanco real) y
// ruido de compresión -con el umbral por defecto ese fondo quedaba
// parcialmente opaco (se veía un recuadro celeste pálido alrededor de las
// garras). Le bajamos el umbral de "fondo" para que ese rango de gris de
// papel también se transparente del todo.
const UMBRALES_POR_SLUG: Record<string, { tinta: number; fondo: number }> = {
  raptor: { tinta: 150, fondo: 232 },
};
const UMBRALES_DEFAULT = { tinta: 220, fondo: 248 };

async function recolorear(inputPath: string, slug: string): Promise<Buffer> {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Umbral en vez de rampa lineal completa: un trazo "tinta sólida" (aunque
  // el logo original ya viniera en un celeste medio, ni negro puro) tiene
  // que quedar 100% opaco -con (255-luminancia) lineal, un trazo de
  // luminancia ~110 quedaba a mitad de opacidad y el color se veía
  // pastel/lavado en vez de un #3B82F6 sólido. Todo lo que esté por debajo
  // de UMBRAL_TINTA es "tinta", 100% opaco; todo por encima de
  // UMBRAL_FONDO es "papel", 100% transparente; en el medio (el borde
  // antialiaseado) se interpola para que el contorno siga suave.
  const { tinta: UMBRAL_TINTA, fondo: UMBRAL_FONDO } = UMBRALES_POR_SLUG[slug] ?? UMBRALES_DEFAULT;
  const salida = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const luminancia = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let alfaPorBrillo: number;
    if (luminancia <= UMBRAL_TINTA) alfaPorBrillo = 255;
    else if (luminancia >= UMBRAL_FONDO) alfaPorBrillo = 0;
    else alfaPorBrillo = 255 * ((UMBRAL_FONDO - luminancia) / (UMBRAL_FONDO - UMBRAL_TINTA));
    const alfaOriginal = data[i + 3];
    salida[i] = COLOR.r;
    salida[i + 1] = COLOR.g;
    salida[i + 2] = COLOR.b;
    salida[i + 3] = Math.round((alfaPorBrillo * alfaOriginal) / 255);
  }

  return sharp(salida, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  const outDir = path.resolve('public/logos-categorias');
  fs.mkdirSync(outDir, { recursive: true });

  for (const [slug, archivo] of Object.entries(ARCHIVOS)) {
    const recoloreado = await recolorear(path.resolve(archivo), slug);

    // Recortar el margen transparente sobrante y centrar en un lienzo
    // cuadrado de SIZE x SIZE, así los 10 quedan del mismo tamaño relativo
    // sin importar cuánto margen traía cada imagen original.
    const recortado = await sharp(recoloreado).trim().toBuffer();
    const meta = await sharp(recortado).metadata();
    const lienzo = SIZE - PADDING * 2;
    const escala = Math.min(lienzo / (meta.width || lienzo), lienzo / (meta.height || lienzo));
    const nuevoAncho = Math.round((meta.width || lienzo) * escala);
    const nuevoAlto = Math.round((meta.height || lienzo) * escala);

    await sharp(recortado)
      .resize(nuevoAncho, nuevoAlto)
      .extend({
        top: Math.floor((SIZE - nuevoAlto) / 2),
        bottom: Math.ceil((SIZE - nuevoAlto) / 2),
        left: Math.floor((SIZE - nuevoAncho) / 2),
        right: Math.ceil((SIZE - nuevoAncho) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(outDir, `${slug}.png`));

    console.log('OK', slug);
  }
}

main();
