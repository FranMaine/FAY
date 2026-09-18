import sharp from 'sharp';
import { put, del } from '@vercel/blob';

const TAMANIO_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export class ImagenInvalidaError extends Error {}

/**
 * Recibe el File de un <input type="file">, lo valida, lo recomprime a
 * WebP cuadrado (evita subir fotos de varios MB tal cual, y normaliza el
 * aspect ratio para que ClubAvatar/foto de perfil siempre se vean bien
 * recortadas) y lo sube a Vercel Blob bajo `carpeta/clave.webp`.
 * Devuelve la URL pública. Requiere BLOB_READ_WRITE_TOKEN configurado
 * (automático si el proyecto tiene un Blob Store conectado en Vercel).
 */
export async function subirImagen(file: File, carpeta: string, clave: string, ladoPx: number): Promise<string> {
  if (!TIPOS_PERMITIDOS.has(file.type)) {
    throw new ImagenInvalidaError('Formato no soportado -usá JPG, PNG, WEBP o AVIF.');
  }
  if (file.size > TAMANIO_MAX_BYTES) {
    throw new ImagenInvalidaError('La imagen pesa demasiado (máximo 5MB).');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(buffer)
    .resize(ladoPx, ladoPx, { fit: 'cover' })
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
