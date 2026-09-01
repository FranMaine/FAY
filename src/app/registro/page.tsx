"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchIcon, Sailboat } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const registroSchema = z.object({
  name: z.string().min(2, { message: "El nombre es muy corto" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof registroSchema>>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [error, setError] = useState<string | null>(null);

  async function onStep1Submit(values: z.infer<typeof registroSchema>) {
    setStep(2);
  }

  async function onFinalSubmit() {
    setIsLoading(true);
    setError(null);
    const values = form.getValues();

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword, // Faltaba esto para que pase la validación Zod del backend
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ocurrió un error al registrarse");
      }

      // Si queremos vincular regatista acá podríamos hacerlo (MVP: no implementado en API para user no auth)
      // En vez de redirigir a login, podemos iniciar sesión automáticamente
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login"); // Fallback
      } else {
        router.push("/mi-perfil");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
      setStep(1); // Volver para mostrar el error
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
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Paso {step} de 2</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md mb-4 text-center">
              {error}
            </div>
          )}
          {step === 1 ? (
            <form onSubmit={form.handleSubmit(onStep1Submit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre completo</label>
                <Input {...form.register("name")} placeholder="Juan Pérez" className="bg-background border-border" />
                {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input {...form.register("email")} type="email" placeholder="tu@email.com" className="bg-background border-border" />
                {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña</label>
                <Input {...form.register("password")} type="password" placeholder="••••••••" className="bg-background border-border" />
                {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar Contraseña</label>
                <Input {...form.register("confirmPassword")} type="password" placeholder="••••••••" className="bg-background border-border" />
                {form.formState.errors.confirmPassword && <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full mt-2">Siguiente</Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-medium text-lg mb-2">¿Querés vincular tu perfil de regatista?</h3>
                <p className="text-sm text-muted-foreground">
                  Busca tu nombre para vincular tu historial de resultados a tu cuenta. Podés hacerlo más tarde.
                </p>
              </div>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o vela..." className="pl-9 bg-background border-border" />
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <Button onClick={onFinalSubmit} disabled={isLoading} className="w-full">
                  {isLoading ? "Creando..." : "Crear cuenta y vincular luego"}
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-muted-foreground hover:text-foreground">
                  Volver atrás
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        {step === 1 && (
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Iniciar sesión
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
