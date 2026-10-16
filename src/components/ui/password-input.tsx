"use client";

import { forwardRef, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Campo de contraseña con un botón para ver/ocultar lo escrito -sobre todo
// en el celular, donde equivocarse tipeando una contraseña a ciegas es lo
// más común. Es un <Input> normal (mismo estilo, acepta ref y los props de
// react-hook-form), así que se usa igual que él; el botón es un <button
// type="button"> para que nunca envíe el formulario.
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input {...props} ref={ref} type={visible ? "text" : "password"} className={cn(className, "pr-11")} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          // h-10 = alto del input; ancho de 44px para que sea cómodo de tocar.
          // Color: casi el del texto (el gris "muted" se perdía sobre el campo
          // oscuro) y, al pasar el mouse o con la contraseña visible, el azul
          // de marca -antes pasaba a casi blanco, que se confundía con que el
          // botón había desaparecido.
          className={cn(
            "absolute right-0 top-0 flex h-10 w-11 items-center justify-center rounded-r-lg transition-colors hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
            visible ? "text-primary" : "text-foreground/75"
          )}
        >
          {visible ? <EyeOffIcon className="h-[18px] w-[18px]" aria-hidden="true" /> : <EyeIcon className="h-[18px] w-[18px]" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
