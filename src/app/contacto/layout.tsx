import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribinos si encontrás un error en los datos o tenés una consulta sobre Regateando.",
};

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
