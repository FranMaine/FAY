import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Cubre tanto /admin/regatistas como /admin/regatistas/duplicados (un
// layout envuelve toda su subcarpeta) -gestión de regatistas es
// exclusiva de ADMIN, ver el comentario largo en admin/layout.tsx.
export default async function AdminRegatistasLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/admin/campeonatos");
  }
  return <>{children}</>;
}
