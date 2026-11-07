import type { Metadata } from "next";

// La conversación es privada (se entra con un link secreto): que no aparezca en buscadores.
export const metadata: Metadata = {
  title: "Tu conversación",
  robots: { index: false, follow: false },
};

export default function ChatContactoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
