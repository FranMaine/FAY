// Escala la foto del hero (logos/20260227 2026 SIY -mc-52404.jpg, subida
// a 500x334px -una preview de PhotoShelter, no el archivo final en alta
// resolución) a un tamaño usable como fondo de pantalla completa.
//
// OJO: esto NO es un upscaler con IA que "inventa" detalle nuevo -es un
// resize de alta calidad (Lanczos3, el mejor kernel que tiene sharp) más
// un paso de sharpen para compensar el suavizado que deja agrandar la
// imagen. Se va a ver notablemente más nítida que si el navegador
// estirara el archivo de 500px directamente, pero sigue sin tener el
// detalle real de una foto nativa en alta resolución -si en algún
// momento aparece el archivo original de PhotoShelter/el fotógrafo, absolutamente
// conviene reemplazar este archivo por ese.
import sharp from "sharp";

const ORIGEN = "logos/20260227 2026 SIY -mc-52404.jpg";
const DESTINO = "public/hero/velero-hero.jpg";
const ANCHO_DESTINO = 1920;

async function main() {
  await sharp(ORIGEN)
    .resize({ width: ANCHO_DESTINO, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.1 })
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(DESTINO);

  const meta = await sharp(DESTINO).metadata();
  console.log(`Listo: ${DESTINO} (${meta.width}x${meta.height})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
