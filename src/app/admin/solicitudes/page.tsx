"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Loader2Icon, CheckIcon, XIcon, CircleCheckIcon, TriangleAlertIcon, CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { cn, mensajeDeError } from "@/lib/utils";
import type { Senal, VerificacionDeclarada } from "@/lib/vinculacion";

interface Solicitud {
  id: string;
  createdAt: string;
  user: { name: string | null; email: string; createdAt: string };
  regatista: {
    id: string;
    nombre: string;
    club: string | null;
    numeroVela: string | null;
    resultados: number;
    ultimoCampeonato: string | null;
  };
  declarado: Partial<VerificacionDeclarada> | null;
  senales: Senal[];
}

interface Vinculacion {
  id: string;
  name: string | null;
  email: string;
  regatista: { id: string; nombre: string; club: { nombre: string } | null } | null;
}

const ESTILO_SENAL = {
  ok: { icono: CircleCheckIcon, clase: "text-green-500" },
  aviso: { icono: TriangleAlertIcon, clase: "text-amber-500" },
  alerta: { icono: CircleAlertIcon, clase: "text-red-500" },
} as const;

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted-foreground shrink-0">{etiqueta}</dt>
      <dd className="font-medium text-right break-words">{valor === null || valor === undefined || valor === "" ? "-" : valor}</dd>
    </div>
  );
}

export default function SolicitudesAdminPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [vinculaciones, setVinculaciones] = useState<Vinculacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [resSol, resVin] = await Promise.all([fetch("/api/admin/solicitudes"), fetch("/api/admin/vinculaciones")]);
      if (!resSol.ok || !resVin.ok) throw new Error("Respuesta no exitosa");
      setSolicitudes(await resSol.json());
      setVinculaciones(await resVin.json());
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las solicitudes. Probá recargar la página.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial de datos desde la API -el lint moderno de hooks
    // preferiría un patrón sin esto, pero es el "fetch al montar" estándar
    // y no hay nada raro pasando acá.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const handleAction = async (id: string, action: "APROBAR" | "RECHAZAR") => {
    setProcesando(id);
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("No se pudo procesar la solicitud");
      await cargar();
      toast.success(action === "APROBAR" ? "Solicitud aprobada" : "Solicitud rechazada");
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setProcesando(null);
    }
  };

  const desvincular = async (v: Vinculacion) => {
    try {
      const res = await fetch(`/api/admin/vinculaciones/${v.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo desvincular");
      await cargar();
      toast.success(`Se desvinculó a ${v.name || v.email}`);
    } catch (err) {
      toast.error(mensajeDeError(err));
    }
  };

  return (
    // Al resto de las páginas de admin (campeonatos, clubes, usuarios...)
    // este <main> con el mismo padding que acá nunca le faltó -a esta sí,
    // y el título quedaba pegado directo contra el navbar.
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Solicitudes de Vinculación</h1>
            <p className="text-muted-foreground mt-2">
              Revisá las peticiones de los usuarios para reclamar perfiles de regatistas. Cada una muestra lo que
              declaró la persona al lado de lo que figura en la ficha.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : solicitudes.length === 0 ? (
            <Card className="bg-surface border-border">
              <CardContent className="text-center p-8 text-muted-foreground">No hay solicitudes pendientes.</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {solicitudes.map((s) => (
                <Card key={s.id} className="bg-surface border-border">
                  <CardContent className="p-5 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Pedido del {formatearFecha(s.createdAt)}</p>
                        <p className="text-lg font-semibold">
                          {s.user.name || "Sin nombre"} <span className="text-muted-foreground font-normal">quiere ser</span>{" "}
                          <span className="text-primary">{s.regatista.nombre}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                          onClick={() => handleAction(s.id, "APROBAR")}
                          disabled={procesando === s.id}
                        >
                          {procesando === s.id ? <Loader2Icon className="w-4 h-4 mr-1 animate-spin" /> : <CheckIcon className="w-4 h-4 mr-1" />}
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                          onClick={() => handleAction(s.id, "RECHAZAR")}
                          disabled={procesando === s.id}
                        >
                          <XIcon className="w-4 h-4 mr-1" /> Rechazar
                        </Button>
                      </div>
                    </div>

                    <ul className="space-y-1.5" aria-label="Señales de verificación">
                      {s.senales.map((senal) => {
                        const { icono: Icono, clase } = ESTILO_SENAL[senal.gravedad];
                        return (
                          <li key={senal.texto} className="flex items-start gap-2 text-sm">
                            <Icono className={cn("w-4 h-4 mt-0.5 shrink-0", clase)} aria-hidden="true" />
                            <span>{senal.texto}</span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="grid gap-4 md:grid-cols-3">
                      <dl className="space-y-1.5 rounded-xl border border-border bg-background p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">La cuenta</h3>
                        <Dato etiqueta="Nombre" valor={s.user.name} />
                        <Dato etiqueta="Email" valor={s.user.email} />
                        <Dato etiqueta="Creada" valor={formatearFecha(s.user.createdAt)} />
                      </dl>
                      <dl className="space-y-1.5 rounded-xl border border-border bg-background p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">La ficha</h3>
                        <Dato etiqueta="Nombre" valor={s.regatista.nombre} />
                        <Dato etiqueta="Club" valor={s.regatista.club} />
                        <Dato etiqueta="N.º de vela" valor={s.regatista.numeroVela} />
                        <Dato etiqueta="Resultados" valor={s.regatista.resultados} />
                        <Dato etiqueta="Último campeonato" valor={s.regatista.ultimoCampeonato} />
                      </dl>
                      <dl className="space-y-1.5 rounded-xl border border-border bg-background p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Lo que declaró</h3>
                        {s.declarado ? (
                          <>
                            <Dato etiqueta="N.º de vela" valor={s.declarado.numeroVela} />
                            <Dato etiqueta="Club" valor={s.declarado.club} />
                            <Dato etiqueta="Último campeonato" valor={s.declarado.ultimoCampeonato} />
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No aportó datos (pedido anterior a que se pidieran).</p>
                        )}
                      </dl>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Vinculaciones activas</h2>
            <p className="text-muted-foreground mt-1">
              Si una cuenta quedó vinculada a un perfil que no le corresponde, desvinculala acá: la ficha y sus
              resultados no se tocan, y la persona recibe un mail avisándole.
            </p>
          </div>
          <Card className="bg-surface border-border">
            <CardContent className="p-0">
              {vinculaciones.length === 0 ? (
                <p className="text-center p-8 text-muted-foreground">Todavía no hay cuentas vinculadas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {vinculaciones.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0 text-sm">
                        <p className="font-medium truncate">
                          {v.name || v.email} <span className="text-muted-foreground font-normal">→</span>{" "}
                          <span className="text-primary">{v.regatista?.nombre}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.email}
                          {v.regatista?.club ? ` · ${v.regatista.club.nombre}` : ""}
                        </p>
                      </div>
                      <ConfirmDeleteButton
                        label={`Desvincular a ${v.name || v.email}`}
                        confirmLabel="¿Desvincular?"
                        onConfirm={() => desvincular(v)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
