"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sailboat, MailCheckIcon } from "lucide-react";
import { mensajeDeError } from "@/lib/utils";

const schema = z.object({
  email: z.string().email({ message: "Email inválido" }),
});

export default function OlvidePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Ocurrió un error");
      }
      // El backend siempre responde igual, exista o no la cuenta, para no
      // filtrar qué emails están registrados -por eso este mensaje es
      // genérico también acá.
      setEnviado(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface border-border">
        <CardHeader className="space-y-2 items-center text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Sailboat className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>Te mandamos un enlace para elegir una nueva</CardDescription>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <div className="text-center space-y-3 py-4">
              <MailCheckIcon className="w-10 h-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Si el email que ingresaste está registrado, te llegó un correo con un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md text-center">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input {...form.register("email")} type="email" placeholder="tu@email.com" className="bg-background border-border" />
                {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Volver a iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
