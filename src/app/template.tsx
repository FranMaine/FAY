// A diferencia de layout.tsx (persiste entre navegaciones), template.tsx se
// vuelve a montar en cada cambio de ruta -así el fade+rise de .page-enter
// (ver globals.css) se dispara solo en cada navegación, sin tener que
// engancharse a ningún evento del router ni a una librería de motion. El
// Navbar y el footer quedan afuera (viven en layout.tsx), así que solo el
// contenido de la página entra con la transición; la barra de navegación
// no parpadea entre rutas.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
