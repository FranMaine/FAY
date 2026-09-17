import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { puedeGestionarCampeonatos } from "@/lib/permisos";

// Antes, /admin/* no tenía ningún control de acceso propio -las páginas
// renderizaban igual para cualquiera, y solo las llamadas a la API fallaban
// si no eras admin. Con el dashboard mostrando datos reales (incluidas
// solicitudes de vinculación con nombre/email de usuarios), conviene cortar
// esto antes de que la página siquiera intente cargar.
//
// Este gate de arriba es a propósito ancho (ADMIN u ORGANIZADOR, no solo
// ADMIN): un ORGANIZADOR tiene que poder entrar a /admin/campeonatos. Lo
// que NO puede ver (clubes, regatistas, solicitudes, errores, usuarios)
// tiene su propio layout.tsx admin-only más estricto en cada una de esas
// carpetas -este layout de acá arriba no alcanza a distinguir esa
// diferencia por sí solo porque envuelve TODO /admin/* por igual.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (!puedeGestionarCampeonatos(session.user.role)) {
    redirect("/");
  }

  return <>{children}</>;
}
