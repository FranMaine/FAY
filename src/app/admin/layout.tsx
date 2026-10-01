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
//
// VigIA (el asistente de IA) NO vive acá -este layout, al leer auth() en
// cada request, se vuelve a renderizar en cualquier navegación que apunte
// de nuevo a la misma ruta en la que ya estás (ej. clickear "Admin" en la
// navbar estando parado en /admin), lo que remonta todo lo que cuelgue de
// acá y tira el estado de VigIA a su valor inicial (cerrado), de golpe y
// sin transición -se veía como si "se abriera y cerrara solo". Vive en el
// layout raíz (ver src/app/layout.tsx), que nunca se remonta por
// navegación del lado del cliente.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (!puedeGestionarCampeonatos(session.user.role)) {
    redirect("/");
  }

  return children;
}
