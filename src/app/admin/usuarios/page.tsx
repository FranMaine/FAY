"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, Loader2Icon, SearchIcon, ShieldIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { mensajeDeError } from "@/lib/utils";

type Rol = "ADMIN" | "ORGANIZADOR" | "REGULAR";

interface Usuario {
  id: string;
  email: string;
  name: string | null;
  role: Rol;
}

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  ORGANIZADOR: "Organizador",
  REGULAR: "Usuario regular",
};

// Asignación de roles: ADMIN tiene acceso total al panel y puede asignar
// tanto ADMIN como ORGANIZADOR a cualquiera; ORGANIZADOR solo puede
// crear/editar campeonatos (cargar resultados, publicar) -pensado para
// la persona del club que organiza una regata puntual, sin acceso a
// clubes, regatistas, solicitudes ni esta misma pantalla.
export default function AdminUsuariosPage() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Usuario[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBuscando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo buscar");
      setResultados(data);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setBuscando(false);
    }
  }

  async function cambiarRol(usuario: Usuario, nuevoRol: Rol) {
    if (nuevoRol === usuario.role) return;
    setGuardando(usuario.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nuevoRol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar el rol");
      setResultados((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, role: nuevoRol } : u)));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(null);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Volver al panel
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Usuarios y roles</h1>
          <p className="text-muted-foreground">
            Buscá una cuenta por email o nombre para asignarle rol de <strong>Organizador</strong> (crear y editar
            campeonatos, cargar resultados) o <strong>Administrador</strong> (acceso total al panel).
          </p>
        </div>

        <form onSubmit={buscar} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email o nombre…"
              className="pl-9 bg-surface border-border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={buscando || query.trim().length < 2}>
            {buscando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>
        )}

        {resultados.length > 0 && (
          <div className="space-y-3">
            {resultados.map((u) => (
              <Card key={u.id} className="bg-surface border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs mt-1 inline-flex items-center gap-1 text-primary">
                      {u.role === "ADMIN" ? <ShieldCheckIcon className="w-3.5 h-3.5" /> : u.role === "ORGANIZADOR" ? <ShieldIcon className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                      {ETIQUETA_ROL[u.role]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(["REGULAR", "ORGANIZADOR", "ADMIN"] as Rol[]).map((rol) => (
                      <Button
                        key={rol}
                        size="sm"
                        variant={u.role === rol ? "default" : "outline"}
                        disabled={guardando === u.id}
                        onClick={() => cambiarRol(u, rol)}
                      >
                        {guardando === u.id ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : ETIQUETA_ROL[rol]}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!buscando && resultados.length === 0 && query.trim().length >= 2 && (
          <p className="text-sm text-muted-foreground text-center py-8">No se encontró ningún usuario.</p>
        )}
      </div>
    </main>
  );
}
