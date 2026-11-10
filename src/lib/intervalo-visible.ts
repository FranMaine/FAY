// setInterval que no trabaja con la pestaña en segundo plano: cada vez que se
// llama a la API desde una pestaña que nadie está mirando se gasta CPU de
// Vercel (el plan gratis tiene un tope mensual) sin que nadie lo vea. Mientras
// la pestaña está oculta se saltea el pedido y, al volver a mostrarse, se
// actualiza enseguida si ya pasó el intervalo. Devuelve la función que lo
// detiene (para el return del useEffect).
export function intervaloVisible(fn: () => void, ms: number): () => void {
  let ultimo = Date.now();
  const correr = () => {
    ultimo = Date.now();
    fn();
  };
  const intervalo = setInterval(() => {
    if (document.visibilityState === "visible") correr();
  }, ms);
  const alVolver = () => {
    if (document.visibilityState === "visible" && Date.now() - ultimo >= ms) correr();
  };
  document.addEventListener("visibilitychange", alVolver);
  return () => {
    clearInterval(intervalo);
    document.removeEventListener("visibilitychange", alVolver);
  };
}
