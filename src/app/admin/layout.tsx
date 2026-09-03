import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Antes, /admin/* no tenía ningún control de acceso propio -las páginas
// renderizaban igual para cualquiera, y solo las llamadas a la API fallaban
// si no eras admin. Con el dashboard mostrando datos reales (incluidas
// solicitudes de vinculación con nombre/email de usuarios), conviene cortar
// esto antes de que la página siquiera intente cargar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
