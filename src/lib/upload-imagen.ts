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

  const ref = esquinas[0];
  const TOL = 40;
  const visitado = new Uint8Array(w * h);
  const pila: number[] = [];
  const empujar = (x: number, y: number) => {
    const idx = y * w + x;
    if (visitado[idx] || dist(px(x, y), ref) > TOL) return;
    visitado[idx] = 1;
    pila.push(idx);
  };
  for (let x = 0; x < w; x++) { empujar(x, 0); empujar(x, h - 1); }
  for (let y = 0; y < h; y++) { empujar(0, y); empujar(w - 1, y); }
  while (pila.length) {
    const idx = pila.pop()!;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) empujar(x - 1, y);
    if (x < w - 1) empujar(x + 1, y);
    if (y > 0) empujar(x, y - 1);
    if (y < h - 1) empujar(x, y + 1);
  }

  let borrados = 0;
  for (let idx = 0; idx < visitado.length; idx++) {
    if (visitado[idx]) { data[idx * 4 + 3] = 0; borrados++; }
  }
  if (borrados < w * h * 0.03) return buffer;

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
    addRandomSuffix: false,
    allowOverwrite: true,
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
