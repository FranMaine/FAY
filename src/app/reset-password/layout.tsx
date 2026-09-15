import type { Metadata } from "next";

// noindex: esta página solo tiene sentido con un ?token= válido en la URL
// -no hay ningún motivo para que aparezca en un resultado de búsqueda.
export const metadata: Metadata = {
  title: "Restablecer contraseña",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
