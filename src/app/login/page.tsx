"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SailingBoat } from "@/components/icons/sailing-boat";

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordRecienRestablecida = searchParams.get("reset") === "1";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailNoVerificado, setEmailNoVerificado] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setError(null);
    setEmailNoVerificado(null);
    setReenviado(false);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.code === "email_no_verificado") {
        setEmailNoVerificado(values.email);
      } else {
        setError("Email o contraseña incorrectos");
      }
    } else {
      router.push("/mi-perfil");
      router.refresh();
    }
  }

  async function reenviarVerificacion() {
    if (!emailNoVerificado) return;
    setReenviando(true);
    try {
      await fetch("/api/auth/reenviar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNoVerificado }),
      });
      setReenviado(true);
    } finally {
      setReenviando(false);
    }
  }

  return (
    <AuthShell>
      <Card className="w-full bg-surface border-border rounded-2xl shadow-xl">
        <CardHeader className="space-y-2 items-center text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <SailingBoat className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Accedé a tu cuenta de Regateando</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordRecienRestablecida && !error && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 text-sm p-3 rounded-md mb-4 text-center">
              Tu contraseña se actualizó correctamente. Ya podés iniciar sesión.
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md mb-4 text-center">
              {error}
            </div>
          )}
          {emailNoVerificado && (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-500 text-sm p-3 rounded-md mb-4 text-center space-y-2">
              <p>Todavía no confirmaste tu email. Revisá tu casilla, o pedimos un nuevo enlace.</p>
              {reenviado ? (
                <p className="font-medium">Listo, te mandamos un nuevo enlace.</p>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={reenviarVerificacion} disabled={reenviando}>
                  {reenviando ? "Enviando…" : "Reenviar email de verificación"}
                </Button>
              )}
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
              <Input
                {...form.register("email")}
                id="login-email"
                autoComplete="email"
                spellCheck={false}
                placeholder="tu@email.com"
                type="email"
                className="bg-background border-border"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">Contraseña</label>
                <Link href="/olvide-password" className="text-xs text-primary hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                {...form.register("password")}
                id="login-password"
                autoComplete="current-password"
                placeholder="••••••••"
                type="password"
                className="bg-background border-border"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Iniciando sesión…" : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center">
            <div className="border-t border-border w-full"></div>
            <span className="bg-surface px-3 text-sm text-muted-foreground">o</span>
            <div className="border-t border-border w-full"></div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="secondary"
              className="w-full bg-background border border-border"
              onClick={() => signIn("google", { callbackUrl: "/" })}
            >
              Continuar con Google
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-primary hover:underline font-medium">
              Registrarse
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams necesita estar debajo de un Suspense boundary en el
  // App Router -sin esto, Next tira error en build.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
