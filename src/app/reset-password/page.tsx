"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sailboat } from "lucide-react";
import { mensajeDeError } from "@/lib/utils";

const schema = z.object({
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const enlaceInvalido = !token || !email;

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!token || !email) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, ...values }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo restablecer la contraseña");
      }
      router.push("/login?reset=1");
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
          <CardTitle className="text-2xl">Elegí tu nueva contraseña</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent>
          {enlaceInvalido ? (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md text-center">
              Este enlace es inválido. Pedí uno nuevo desde{" "}
              <Link href="/olvide-password" className="underline font-medium">
                recuperar contraseña
              </Link>.
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md text-center">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nueva contraseña</label>
                <Input {...form.register("password")} type="password" placeholder="••••••••" className="bg-background border-border" />
                {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar contraseña</label>
                <Input {...form.register("confirmPassword")} type="password" placeholder="••••••••" className="bg-background border-border" />
                {form.formState.errors.confirmPassword && <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Restablecer contraseña"}
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

export default function ResetPasswordPage() {
  // useSearchParams necesita estar debajo de un Suspense boundary en el
  // App Router -sin esto, Next tira error en build ("should be wrapped in
  // a suspense boundary").
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
