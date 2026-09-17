import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// El layout de /admin (ver src/app/admin/layout.tsx) deja pasar tanto a
// ADMIN como a ORGANIZADOR -pero la gestión de clubes es exclusiva de
// ADMIN, así que esta carpeta necesita su propio gate más estricto encima
// del general.
export default async function AdminClubesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/admin/campeonatos");
  }
  return <>{children}</>;
}
