import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { quitarFondoLiso } from "../upload-imagen";

// fixtures/logo-banner-texto.png es un caso real que reprodujo el bug: un
// logo tipo banner (fondo de color sólido + texto blanco, "COPA DON
// GERARDO") -el flood-fill del fondo no tocaba las letras, pero el paso
// extra pensado para "marcos de color finos" terminaba comiéndose el
// texto entero, pasada por pasada, porque el límite del 15% se chequeaba
// por pasada y no acumulado (ver el commit que corrigió esto: sobrevivían
// solo los huecos internos de letras como O/D/P/A/R, desconectados del
// borde). Un SVG con texto renderizado no reproducía el bug de forma
// confiable acá (el antialiasing/la fuente disponible en CI no coincide
// con el original) -por eso el fixture es la imagen real.
const FIXTURE = path.join(__dirname, "fixtures/logo-banner-texto.png");

async function contarPixelesBlancosOpacos(buffer: Buffer): Promise<number> {
  const { data } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232 && data[i + 3] > 200) n++;
  }
  return n;
}

describe("quitarFondoLiso", () => {
  it("no se come el texto blanco de un banner (regresión)", async () => {
    // Mismo pipeline que subirImagen en modo 'inside': bajar a un tamaño de
    // trabajo acotado antes de procesar (ver el comentario ahí).
    const original = await sharp(fs.readFileSync(FIXTURE))
      .resize(900, 900, { fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const blancosAntes = await contarPixelesBlancosOpacos(original);
    expect(blancosAntes).toBeGreaterThan(500); // el texto realmente está ahí

    const resultado = await quitarFondoLiso(original);
    const blancosDespues = await contarPixelesBlancosOpacos(resultado);

    // Antes del fix esto caía a ~5% del original (solo huecos internos de
    // letras sueltos) -con el fix, la gran mayoría del texto sigue ahí.
    expect(blancosDespues).toBeGreaterThan(blancosAntes * 0.7);
  });

  it("sigue borrando un marco de color fino real alrededor de un escudo", async () => {
    // Círculo de color sobre un marco/borde fino de OTRO color sobre fondo
    // blanco -el caso que este paso extra existe para resolver, tiene que
    // seguir funcionando después del fix.
    const w = 200, h = 200;
    const svg = Buffer.from(`
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <circle cx="100" cy="100" r="90" fill="none" stroke="rgb(37,99,235)" stroke-width="6"/>
        <circle cx="100" cy="100" r="70" fill="rgb(220,38,38)"/>
      </svg>
    `);
    const original = await sharp(svg).png().toBuffer();
    const resultado = await quitarFondoLiso(original);
    const { data } = await sharp(resultado).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Esquina: tiene que haber quedado transparente (fondo + marco borrados).
    expect(data[3]).toBe(0);
    // Centro (el círculo rojo): tiene que seguir opaco.
    const centro = (100 * w + 100) * 4;
    expect(data[centro + 3]).toBeGreaterThan(200);
  });
});
