import type { Metadata } from "next";

// login/page.tsx es "use client" (usa hooks de formulario) -un componente
// cliente no puede exportar `metadata`, así que este layout (servidor) lo
// hace por él. Mismo patrón en registro/, olvide-password/,
// reset-password/ y vincular/.
export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Iniciá sesión en Regateando para ver tu perfil de regatista y vincular tu historial de resultados.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
