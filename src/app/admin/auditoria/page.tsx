"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BotIcon,
  Building2Icon,
  ClipboardListIcon,
  FlagIcon,
  Link2Icon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  StarIcon,
  TrophyIcon,
  UserIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mensajeDeError, cn } from "@/lib/utils";
import { CATEGORIAS, describirAuditoria, type CategoriaAuditoria, type Tono } from "@/lib/auditoria-texto";

interface AuditLogItem {
  id: string;
  actorEmail: string;
  actorNombre: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: Record<string, unknown> | null;
  entidadNombre: string | null;
  campeonatoNombre: string | null;
  createdAt: string;
}

const ICONOS: Record<CategoriaAuditoria, LucideIcon> = {
  cuentas: UserRoundIcon,
  perfiles: UserIcon,
  favoritos: StarIcon,
  vinculaciones: Link2Icon,
  campeonatos: TrophyIcon,
  regatas: FlagIcon,
  regatistas: UsersIcon,
  clubes: Building2Icon,
  automaticas: BotIcon,
};

// Color del círculo del ícono según qué tan "delicada" es la acción.
const COLORES: Record<Tono, string> = {
  normal: "bg-primary/10 text-primary",
  positivo: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  atencion: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  peligro: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const PASO = 50;

function etiquetaDelDia(fecha: Date): string {
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismoDia(fecha, hoy)) return "Hoy";
  if (mismoDia(fecha, ayer)) return "Ayer";
  const texto = fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Acciones de la propia persona hablan en primera persona ("cambió su
// apodo"); el sistema, con un nombre claro en vez de "sistema".
function nombreDelActor(r: AuditLogItem): { principal: string; secundario: string | null; sistema: boolean } {
  if (r.actorEmail === "sistema") return { principal: r.actorNombre || "El sistema", secundario: null, sistema: true };
  return { principal: r.actorNombre || r.actorEmail, secundario: r.actorNombre ? r.actorEmail : null, sistema: false };
}

export default function AdminAuditoriaPage() {
  const [registros, setRegistros] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaAuditoria | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(PASO);

  const cargar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auditoria");
      if (!res.ok) throw new Error("No se pudo cargar el registro");
      setRegistros(await res.json());
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  // Cada registro ya traducido a frase, una sola vez.
  const items = useMemo(
    () =>
      registros.map((r) => ({
        r,
        desc: describirAuditoria(r),
        actor: nombreDelActor(r),
        fecha: new Date(r.createdAt),
      })),
    [registros]
  );

  const cuentaPorCategoria = useMemo(() => {
    const cuenta: Partial<Record<CategoriaAuditoria, number>> = {};
    for (const i of items) cuenta[i.desc.categoria] = (cuenta[i.desc.categoria] ?? 0) + 1;
    return cuenta;
  }, [items]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((i) => {
      if (categoria !== "todas" && i.desc.categoria !== categoria) return false;
      if (!q) return true;
      return `${i.actor.principal} ${i.actor.secundario ?? ""} ${i.desc.frase} ${i.desc.lineas.join(" ")}`.toLowerCase().includes(q);
    });
  }, [items, categoria, busqueda]);

  // Agrupados por día (ya vienen del más nuevo al más viejo).
  const grupos = useMemo(() => {
    const salida: { dia: string; items: typeof filtrados }[] = [];
    for (const i of filtrados.slice(0, visibles)) {
      const dia = etiquetaDelDia(i.fecha);
      const ultimo = salida[salida.length - 1];
      if (ultimo && ultimo.dia === dia) ultimo.items.push(i);
      else salida.push({ dia, items: [i] });
    }
    return salida;
  }, [filtrados, visibles]);

  const categoriasConDatos = (Object.keys(CATEGORIAS) as CategoriaAuditoria[]).filter((c) => cuentaPorCategoria[c]);

  return (
    <main className="min-h-dvh bg-background text-foreground p-4 sm:p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <ClipboardListIcon className="w-8 h-8 text-primary" aria-hidden="true" />
              Auditoría
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Quién hizo qué en el sitio, de lo más nuevo a lo más viejo. Se muestran las últimas {registros.length || 300} acciones.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar} disabled={isLoading} className="gap-2">
            <RefreshCwIcon className={cn("w-4 h-4", isLoading && "animate-spin")} aria-hidden="true" /> Actualizar
          </Button>
        </header>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {!isLoading && registros.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Buscar en la auditoría"
                placeholder="Buscar por persona, campeonato, club…"
                className="pl-9 bg-surface border-border"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setVisibles(PASO);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
              {(["todas", ...categoriasConDatos] as const).map((c) => {
                const activo = categoria === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => {
                      setCategoria(c);
                      setVisibles(PASO);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      activo ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-primary"
                    )}
                  >
                    {c === "todas" ? "Todas" : CATEGORIAS[c]}
                    <span className={cn("ml-1.5 tabular-nums", activo ? "text-white/80" : "text-muted-foreground")}>
                      {c === "todas" ? items.length : cuentaPorCategoria[c]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Cargando" />
          </div>
        ) : registros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-muted-foreground">
            Todavía no hay ninguna acción registrada.
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-muted-foreground">
            No hay acciones que coincidan con ese filtro.
          </div>
        ) : (
          <div className="space-y-8">
            {grupos.map((g) => (
              <section key={g.dia} aria-label={g.dia} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.dia}</h2>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {g.items.map(({ r, desc, actor, fecha }) => {
                    const Icono = ICONOS[desc.categoria];
                    return (
                      <li key={r.id} className="flex gap-3 p-4">
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", COLORES[desc.tono])}>
                          <Icono className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="leading-snug">
                            <span className="font-semibold" title={actor.secundario ?? undefined}>
                              {actor.principal}
                            </span>{" "}
                            {desc.frase}
                          </p>
                          {desc.lineas.map((linea) => (
                            <p key={linea} className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                              {linea}
                            </p>
                          ))}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                            <time dateTime={r.createdAt} title={fecha.toLocaleString("es-AR")} className="tabular-nums">
                              {fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} h
                            </time>
                            <span>{CATEGORIAS[desc.categoria]}</span>
                            {actor.secundario && <span className="[overflow-wrap:anywhere]">{actor.secundario}</span>}
                          </div>
                          {(r.detalle || r.entidadId) && (
                            <details className="text-xs text-muted-foreground">
                              <summary className="cursor-pointer select-none hover:text-foreground w-fit">Ver datos técnicos</summary>
                              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-background p-2 font-mono text-[11px] leading-relaxed">
                                {JSON.stringify({ accion: r.accion, entidad: r.entidad, id: r.entidadId, ...(r.detalle ?? {}) }, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {filtrados.length > visibles && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setVisibles((v) => v + PASO)}>
                  Mostrar más ({filtrados.length - visibles} restantes)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
