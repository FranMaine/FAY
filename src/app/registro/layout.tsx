import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Creá tu cuenta en FAY Stats y vinculá tu perfil de regatista para ver tu historial de resultados.",
};

export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
