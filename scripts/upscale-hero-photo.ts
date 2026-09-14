// Escala la foto del hero (logos/e8f71a68-99a5-470d-af76-2c2af7d63073.jpg,
// 1000x668px) a un tamaño usable como fondo de pantalla completa.
//
// OJO: esto NO es un upscaler con IA que "inventa" detalle nuevo -es un
// resize de alta calidad (Lanczos3, el mejor kernel que tiene sharp) más
// un paso de sharpen para compensar el suavizado que deja agrandar la
// imagen. Si en algún momento aparece un archivo en mayor resolución
// todavía, conviene actualizar ORIGEN acá abajo y volver a correr este
// script.
import sharp from "sharp";

const ORIGEN = "logos/e8f71a68-99a5-470d-af76-2c2af7d63073.jpg";
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
