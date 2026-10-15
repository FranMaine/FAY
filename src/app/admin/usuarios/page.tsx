"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, SearchIcon, ShieldIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { mensajeDeError } from "@/lib/utils";
import { toast } from "sonner";

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
// Misma cifra que LIMITE_LISTA de /api/admin/usuarios: si la lista llega
// justo a ese tamaño, puede haber más cuentas que las mostradas.
const LIMITE_LISTA = 500;

export default function AdminUsuariosPage() {
  const [query, setQuery] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  // Resultado de buscar en el servidor -solo cuando la lista completa no
  // entra (más de LIMITE_LISTA cuentas); si no, se filtra acá, al instante.
  const [remotos, setRemotos] = useState<Usuario[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listaIncompleta = usuarios.length >= LIMITE_LISTA;
  const q = query.trim().toLowerCase();

  useEffect(() => {
    let cancelado = false;
    fetch("/api/admin/usuarios")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar la lista");
        if (!cancelado) setUsuarios(data);
      })
      .catch((err) => {
        if (!cancelado) setError(mensajeDeError(err));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Con la lista completa en pantalla no hace falta ir al servidor; si hay
  // más cuentas que el límite, se busca allá (con una pausa al tipear).
  useEffect(() => {
    if (!listaIncompleta || q.length < 2) return;
    let cancelado = false;
    const t = setTimeout(() => {
      fetch(`/api/admin/usuarios?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "No se pudo buscar");
          if (!cancelado) setRemotos(data);
        })
        .catch((err) => {
          if (!cancelado) setError(mensajeDeError(err));
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [q, listaIncompleta]);

  const visibles = useMemo(() => {
    if (!q) return usuarios;
    if (listaIncompleta) return q.length >= 2 ? (remotos ?? []) : usuarios;
    return usuarios.filter((u) => u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q));
  }, [q, usuarios, remotos, listaIncompleta]);

  async function cambiarRol(usuario: Usuario, nuevoRol: Rol) {
    if (nuevoRol === usuario.role) return;
    setGuardando(usuario.id);
    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nuevoRol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar el rol");
      const aplicar = (prev: Usuario[]) => prev.map((u) => (u.id === usuario.id ? { ...u, role: nuevoRol } : u));
      setUsuarios(aplicar);
      setRemotos((prev) => (prev ? aplicar(prev) : prev));
      toast.success(`${usuario.name || usuario.email} ahora es ${ETIQUETA_ROL[nuevoRol]}`);
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setGuardando(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Usuarios y roles</h1>
          <p className="text-muted-foreground">
            Asigná rol de <strong>Organizador</strong> (crear y editar campeonatos, cargar resultados) o{" "}
            <strong>Administrador</strong> (acceso total al panel) a cualquier cuenta. Usá el buscador para filtrar por
            email o nombre.
          </p>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Buscar usuario por email o nombre"
            placeholder="Buscar por email o nombre…"
            className="pl-9 bg-surface border-border"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>
        )}

        {cargando && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2Icon className="w-4 h-4 animate-spin" /> Cargando usuarios…
          </p>
        )}

        {!cargando && !error && (
          <p className="text-sm text-muted-foreground">
            {q
              ? `${visibles.length} ${visibles.length === 1 ? "resultado" : "resultados"}`
              : `${usuarios.length} ${usuarios.length === 1 ? "usuario" : "usuarios"}${listaIncompleta ? " (se muestran los primeros; buscá para encontrar a otros)" : ""}`}
          </p>
        )}

        {visibles.length > 0 && (
          <div className="space-y-3">
            {visibles.map((u) => (
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

        {!cargando && !error && visibles.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {q ? "No se encontró ningún usuario." : "Todavía no hay usuarios."}
          </p>
        )}
      </div>
    </main>
  );
}
