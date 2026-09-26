"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

// El tema del sitio es una clase "dark" en <html> (ver ThemeToggle), no la
// preferencia del sistema, y Sonner por default no la sigue: se observa la
// clase para que los avisos cambien junto con el toggle.
export function AppToaster() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    const html = document.documentElement;
    const leer = () => setTema(html.classList.contains("dark") ? "dark" : "light");
    leer();
    const observer = new MutationObserver(leer);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return <Toaster theme={tema} position="bottom-center" richColors closeButton mobileOffset={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }} />;
}
