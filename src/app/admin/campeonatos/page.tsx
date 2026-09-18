"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, EditIcon, EyeIcon, Loader2Icon, ChevronRightIcon, FolderIcon } from "lucide-react";
import Link from "next/link";
import { NuevoCampeonatoModal } from "@/components/admin/nuevo-campeonato-modal";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { mensajeDeError, cn } from "@/lib/utils";
import { ClaseIcon } from "@/components/icons/clase-icons";

interface Campeonato {
  id: string;
  nombre: string;
  evento?: string | null;
  anio: number;
  estado: "BORRADOR" | "PUBLICADO";
  clase: { id: string; nombre: string };
}

interface Clase {
  id: string;
  nombre: string;
}

// Un mismo evento (ej: "Vela Fest 2026") carga una fila por clase -antes
// se veían todas sueltas en una lista plana sin ninguna agrupación
// visual, mezcladas con el resto de los campeonatos del sistema. Agrupar
// por nombre+año (misma clave que ya usa scripts/audit-db.ts para
// detectar duplicados) las junta como "carpeta" del evento, con sus
// categorías adentro.
function agruparPorEvento(campeonatos: Campeonato[]) {
  const grupos = new Map<string, { nombre: string; anio: number; items: Campeonato[] }>();
  for (const c of campeonatos) {
    const nombreGrupo = c.evento?.trim() || c.nombre;
    const clave = `${nombreGrupo.toLowerCase()}__${c.anio}`;
    if (!grupos.has(clave)) grupos.set(clave, { nombre: nombreGrupo, anio: c.anio, items: [] });
    grupos.get(clave)!.items.push(c);
  }
  return [...grupos.values()].sort((a, b) => b.anio - a.anio || a.nombre.localeCompare(b.nombre));
}

export default function AdminCampeonatosPage() {
  const router = useRouter();
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Carpetas abiertas -por defecto todas cerradas, así la vista inicial
  // es una lista corta de eventos en vez de la lista larga de siempre.
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [campeonatosRes, clasesRes] = await Promise.all([
        fetch("/api/campeonatos"),
        fetch("/api/clases"),
      ]);
      setCampeonatos(await campeonatosRes.json());
      setClases(await clasesRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const grupos = useMemo(() => agruparPorEvento(campeonatos), [campeonatos]);

  function toggle(clave: string) {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  }

  const handleEliminar = async (c: Campeonato) => {
    // La confirmación ahora la maneja ConfirmDeleteButton (in-place, no un
    // window.confirm nativo) -acá ya llega confirmado.
    setDeletingId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/campeonatos/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar el campeonato");
      }
      await fetchData();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setDeletingId(null);
    }
  };

  function filaClase(c: Campeonato) {
    return (
      <tr key={c.id} className="hover:bg-background/50 transition-colors">
        <td className="px-6 py-3 pl-14">
          <span className="flex items-center gap-2">
            {c.clase && <ClaseIcon nombreClase={c.clase.nombre} className="w-6 h-6 shrink-0 object-contain" />}
            {c.clase?.nombre}
          </span>
        </td>
        <td className="px-6 py-3">
          <Badge variant={c.estado === "PUBLICADO" ? "default" : "muted"} className={
            c.estado === "PUBLICADO" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
          }>
            {c.estado}
          </Badge>
        </td>
        <td className="px-6 py-3 text-right space-x-2">
          <Link href={`/admin/campeonatos/${c.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
              <EyeIcon className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/admin/campeonatos/${c.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
              <EditIcon className="w-4 h-4" />
            </Button>
          </Link>
          <ConfirmDeleteButton
            label={`Eliminar "${c.nombre}" (${c.clase?.nombre})`}
            disabled={deletingId === c.id}
            onConfirm={() => handleEliminar(c)}
          />
        </td>
      </tr>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Gestión de Campeonatos</h1>
            <p className="text-muted-foreground text-lg">Administrá los campeonatos del sistema, agrupados por evento</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="w-4 h-4" /> Nuevo Campeonato
          </Button>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>
        )}

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Evento / Clase</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center">
                      <Loader2Icon className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : grupos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                      Todavía no hay campeonatos cargados.
                    </td>
                  </tr>
                ) : (
                  grupos.map((grupo) => {
                    const clave = `${grupo.nombre.trim().toLowerCase()}__${grupo.anio}`;
                    // Un evento con una sola clase no necesita el gesto de
                    // "abrir la carpeta" -se muestra directo, como una fila
                    // normal, con la clase al lado del nombre.
                    if (grupo.items.length === 1) {
                      const c = grupo.items[0];
                      return (
                        <tr key={clave} className="hover:bg-background/50 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              {c.nombre} <span className="text-muted-foreground font-normal">{grupo.anio}</span>
                              <span className="text-muted-foreground mx-1">·</span>
                              {c.clase && <ClaseIcon nombreClase={c.clase.nombre} className="w-5 h-5 shrink-0 object-contain" />}
                              <span className="text-muted-foreground font-normal">{c.clase?.nombre}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={c.estado === "PUBLICADO" ? "default" : "muted"} className={
                              c.estado === "PUBLICADO" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                            }>
                              {c.estado}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Link href={`/admin/campeonatos/${c.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/admin/campeonatos/${c.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
                                <EditIcon className="w-4 h-4" />
                              </Button>
                            </Link>
                            <ConfirmDeleteButton
                              label={`Eliminar "${c.nombre}"`}
                              disabled={deletingId === c.id}
                              onConfirm={() => handleEliminar(c)}
                            />
                          </td>
                        </tr>
                      );
                    }

                    const abierta = abiertas.has(clave);
                    return (
                      <Fragment key={clave}>
                        <tr
                          className="hover:bg-background/50 transition-colors cursor-pointer"
                          onClick={() => toggle(clave)}
                        >
                          <td className="px-6 py-4 font-semibold" colSpan={2}>
                            <div className="flex items-center gap-2">
                              <ChevronRightIcon className={cn("w-4 h-4 text-muted-foreground transition-transform", abierta && "rotate-90")} />
                              <FolderIcon className="w-4 h-4 text-primary" />
                              {grupo.nombre} <span className="text-muted-foreground font-normal">{grupo.anio}</span>
                              <span className="text-muted-foreground font-normal text-xs">
                                ({grupo.items.length} categorías)
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4" />
                        </tr>
                        {abierta && grupo.items.map((c) => filaClase(c))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NuevoCampeonatoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        // Redirigimos directo a la página de edición del campeonato recién
        // creado -antes había que cerrar el modal y buscarlo a mano en la
        // tabla para poder cargarle las regatas y resultados.
        onCreated={(campeonato) => router.push(`/admin/campeonatos/${campeonato.id}`)}
        clases={clases}
      />
    </main>
  );
}
