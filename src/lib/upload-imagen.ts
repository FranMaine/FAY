import sharp from 'sharp';
import { put, del } from '@vercel/blob';

const TAMANIO_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export class ImagenInvalidaError extends Error {}

/**
 * Vuelve transparente el fondo liso de una imagen (típico de un escudo
 * sobre fondo blanco): toma el color de las cuatro esquinas y, si son
 * parecidas entre sí, borra por "relleno desde los bordes" todo lo
 * conectado al borde con un color cercano. Lo que queda encerrado dentro
 * del escudo (ej: un blanco interno) no se toca. Si el fondo no es liso
 * (foto, degradé) no hace nada y la imagen queda como estaba.
 */
export async function quitarFondoLiso(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x: number, y: number) => (y * w + x) * 4;
  const esquinas = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const dist = (i: number, j: number) =>
    Math.max(Math.abs(data[i] - data[j]), Math.abs(data[i + 1] - data[j + 1]), Math.abs(data[i + 2] - data[j + 2]));

  if (esquinas.some((e) => data[e + 3] < 250)) return buffer; // ya tiene transparencia
  if (esquinas.some((e) => dist(e, esquinas[0]) > 24)) return buffer; // fondo no uniforme

  const total = w * h;
  const borrado = new Uint8Array(total);
  const TOL = 40;
  const esBlanco = (i: number) => data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232;

  // Relleno desde los bordes: borra lo conectado con color cercano a `ref`
  // (o blanco) que no fue borrado antes. Devuelve cuántos píxeles borró.
  const rellenar = (ref: number, semillas: number[], permitirBlanco: boolean) => {
    const pila: number[] = [];
    let n = 0;
    const empujar = (idx: number) => {
      if (borrado[idx]) return;
      const i = idx * 4;
      if (dist(i, ref) > TOL && !(permitirBlanco && esBlanco(i))) return;
      borrado[idx] = 1;
      n++;
      pila.push(idx);
    };
    semillas.forEach(empujar);
    while (pila.length) {
      const idx = pila.pop()!;
      const x = idx % w;
      if (x > 0) empujar(idx - 1);
      if (x < w - 1) empujar(idx + 1);
      if (idx >= w) empujar(idx - w);
      if (idx < total - w) empujar(idx + w);
    }
    return n;
  };

  const bordes: number[] = [];
  for (let x = 0; x < w; x++) bordes.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) bordes.push(y * w, y * w + w - 1);
  rellenar(esquinas[0], bordes, esBlanco(esquinas[0]));

  // Escudos que vienen con un marco de color (ej: borde azul sobre blanco):
  // si lo que queda pegado al fondo borrado es un anillo fino de un solo
  // color que rodea toda la imagen, se lo trata también como fondo. Máximo
  // 3 capas, y solo si son finos, para no comerse el escudo en sí.
  for (let pasada = 0; pasada < 3; pasada++) {
    const frontera: number[] = [];
    for (let idx = 0; idx < total; idx++) {
      if (borrado[idx]) continue;
      const x = idx % w;
      const vecinoBorrado =
        (x > 0 && borrado[idx - 1]) || (x < w - 1 && borrado[idx + 1]) ||
        (idx >= w && borrado[idx - w]) || (idx < total - w && borrado[idx + w]);
      if (vecinoBorrado) frontera.push(idx);
    }
    if (frontera.length < 2 * (w + h) * 0.6) break;
    const base = frontera[0] * 4;
    const uniformes = frontera.filter((idx) => dist(idx * 4, base) <= TOL).length;
    if (uniformes < frontera.length * 0.85) break;
    const copia = borrado.slice();
    const n = rellenar(base, frontera, false);
    if (!esBlanco(base) && n > total * 0.15) { borrado.set(copia); break; }
  }

  let borrados = 0;
  for (let idx = 0; idx < total; idx++) {
    if (borrado[idx]) { data[idx * 4 + 3] = 0; borrados++; }
  }
  if (borrados < total * 0.03) return buffer;

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/**
 * Recibe el File de un <input type="file">, lo valida, lo recomprime a
 * WebP (modo 'cover': cuadrado recortado, para fotos de perfil; modo
 * 'inside': conserva la proporción original sin recortar, para escudos) y lo sube a Vercel Blob bajo `carpeta/clave.webp`.
 * Devuelve la URL pública. Requiere BLOB_READ_WRITE_TOKEN configurado
 * (automático si el proyecto tiene un Blob Store conectado en Vercel).
 */
export async function subirImagen(
  file: File,
  carpeta: string,
  clave: string,
  ladoPx: number,
  modo: 'cover' | 'inside' = 'cover'
): Promise<string> {
  if (!TIPOS_PERMITIDOS.has(file.type)) {
    throw new ImagenInvalidaError('Formato no soportado -usá JPG, PNG, WEBP o AVIF.');
  }
  if (file.size > TAMANIO_MAX_BYTES) {
    throw new ImagenInvalidaError('La imagen pesa demasiado (máximo 5MB).');
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  if (modo === 'inside') buffer = await quitarFondoLiso(buffer);
  const webp = await sharp(buffer)
    .resize(ladoPx, ladoPx, modo === 'cover' ? { fit: 'cover' } : { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const blob = await put(`${carpeta}/${clave}.webp`, webp, {
    access: 'public',
    contentType: 'image/webp',
    // URL nueva en cada subida: con una URL fija, el CDN de Blob y el caché de
    // next/image seguían mostrando la imagen anterior después de reemplazarla.
    addRandomSuffix: true,
  });

  return blob.url;
}

export async function borrarImagen(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    // No es crítico -si el blob ya no existe o el borrado falla, seguimos
    // igual con la actualización del registro en la base.
    console.error('[upload-imagen] Error borrando blob:', error);
  }
}
