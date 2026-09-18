import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// mi-perfil/page.tsx ya hacía este mismo chequeo a mano (con redirect()
// adentro del propio componente) -queda como estaba, no se toca. Este
// layout es sobre todo para /mi-perfil/configuracion (página nueva, sin
// chequeo propio todavía) sin tener que repetir la lógica ahí también;
// que también cubra a page.tsx de paso es redundante pero inofensivo.
export default async function MiPerfilLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  return <>{children}</>;
}
