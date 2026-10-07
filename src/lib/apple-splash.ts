// Tamaños de pantalla de iPhones actuales (ancho x alto en puntos, y su
// densidad de píxeles) para los que Safari/iOS busca una
// "apple-touch-startup-image" al abrir la app desde la pantalla de inicio.
// Sin esto, iOS muestra una pantalla negra lisa mientras carga -con esto,
// muestra el logo de Orzando como pantalla de carga. No cubre iPads (el uso
// del sitio es mayormente desde el celular).
const DISPOSITIVOS = [
  { ancho: 440, alto: 956, dpr: 3 }, // iPhone 16 Pro Max
  { ancho: 430, alto: 932, dpr: 3 }, // iPhone 15/16 Plus, 14/15 Pro Max
  { ancho: 428, alto: 926, dpr: 3 }, // iPhone 12/13 Pro Max, 14 Plus
  { ancho: 402, alto: 874, dpr: 3 }, // iPhone 16 Pro
  { ancho: 393, alto: 852, dpr: 3 }, // iPhone 14/15/16 Pro, 15/16
  { ancho: 390, alto: 844, dpr: 3 }, // iPhone 12/12 Pro/13/13 Pro/14
  { ancho: 375, alto: 812, dpr: 3 }, // iPhone X/XS/11 Pro/12 mini/13 mini
  { ancho: 414, alto: 896, dpr: 3 }, // iPhone XS Max/11 Pro Max
  { ancho: 414, alto: 896, dpr: 2 }, // iPhone XR/11
  { ancho: 375, alto: 667, dpr: 2 }, // iPhone SE 2/3, 8, 7, 6s, 6
] as const;

function mediaDePantalla(ancho: number, alto: number, dpr: number, esquema: "light" | "dark") {
  return `(device-width: ${ancho}px) and (device-height: ${alto}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${esquema})`;
}

// Genera las dos variantes (clara/oscura) por cada tamaño físico de pantalla
// en píxeles reales (ancho*dpr x alto*dpr), que es como los pide iOS.
export function imagenesDeInicioApple(): { url: string; media: string }[] {
  return DISPOSITIVOS.flatMap(({ ancho, alto, dpr }) => {
    const anchoPx = ancho * dpr;
    const altoPx = alto * dpr;
    return (["light", "dark"] as const).map((esquema) => ({
      url: `/splash/${anchoPx}x${altoPx}${esquema === "dark" ? "-dark" : ""}`,
      media: mediaDePantalla(ancho, alto, dpr, esquema),
    }));
  });
}
