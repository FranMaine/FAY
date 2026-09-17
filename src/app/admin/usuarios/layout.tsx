import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Asignar roles es exclusivo de ADMIN -un ORGANIZADOR no puede promover a
// nadie más, ni a sí mismo.
export default async function AdminUsuariosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/admin/campeonatos");
  }
  return <>{children}</>;
}
