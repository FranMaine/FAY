import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminAuditoriaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/admin/campeonatos");
  }
  return <>{children}</>;
}
