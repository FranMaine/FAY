import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vincular perfil",
  robots: { index: false, follow: false },
};

export default function VincularLayout({ children }: { children: React.ReactNode }) {
  return children;
}
