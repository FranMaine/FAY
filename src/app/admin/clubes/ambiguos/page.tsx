"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, ArrowLeftIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mensajeDeError } from "@/lib/utils";

interface RegatistaItem {
  id: string;
  nombre: string;
}

interface Combo {
  id: string;
  nombre: string;
  regatistas: RegatistaItem[];
  candidatos: { id: string; nombre: string }[];
  nuevos: string[];
}

// Panel para resolver a mano los dos tipos de caso "incierto" que quedaron
// después de la limpieza automática de datos de clubes (ver el commit de
// la sección Clubes): clubes "combo" (varios clubes reales pegados con
// "/" o "|", donde no se sabe a cuál pertenece cada regatista) y la sigla
// "CNP" (que en la base tenía dos nombres completos distintos, ambiguos).
// Ninguno de los dos se puede resolver solo -por eso este panel, en vez de
// una fusión automática.
export default function AdminClubesPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [creandoPara, setCreandoPara] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");

  const cargar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clubes/combos");
      if (!res.ok) throw new Error("No se pudo cargar la lista");
      const data = await res.json();
      setCombos(data.combos);
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

  async function reasignar(comboId: string, regatistaId: string, clubId: string | null, nuevoClubNombre?: string, clubIds?: string[]) {
    setGuardando(regatistaId);
    try {
      const res = await fetch(`/api/admin/regatistas/${regatistaId}/club`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clubIds ? { clubIds } : nuevoClubNombre ? { nuevoClubNombre } : { clubId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "No se pudo reasignar");
      // Sacamos al regatista de la lista del combo en el estado local -si
      // era el último, el combo entero desaparece de la vista (ya no tiene
      // nada pendiente de resolver acá).
      setCombos((prev) =>
        prev
          .map((c) => (c.id === comboId ? { ...c, regatistas: c.regatistas.filter((r) => r.id !== regatistaId) } : c))
          .filter((c) => c.regatistas.length > 0)
      );
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Clubes ambiguos</h1>
            <p className="text-muted-foreground text-lg">
              Casos que la limpieza automática de datos no pudo resolver sola -necesitan una decisión.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/clubes">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeftIcon className="w-4 h-4" /> Volver al listado
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={cargar} className="gap-2">
              <RefreshCwIcon className="w-4 h-4" /> Actualizar
            </Button>
          </div>
        </header>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clubes combinados</h2>
            <p className="text-sm text-muted-foreground">
              El nombre junta varios clubes reales (&quot;A / B&quot;): elegí a cuál pertenece cada regatista, o dejalo como está.
            </p>
          </div>

          {combos.length === 0 ? (
            <Card className="bg-surface border-border text-center py-10">
              <CardContent className="text-muted-foreground">No quedan clubes combinados por resolver.</CardContent>
            </Card>
          ) : (
            combos.map((combo) => (
              <Card key={combo.id} className="bg-surface border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-mono">{combo.nombre}</CardTitle>
                  <CardDescription>{combo.regatistas.length} regatista{combo.regatistas.length === 1 ? "" : "s"} pendiente{combo.regatistas.length === 1 ? "" : "s"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {combo.candidatos.length === 0 && (
                    <p className="text-xs text-amber-500 flex items-center gap-1.5 mb-2">
                      <AlertCircleIcon className="w-3.5 h-3.5" />
                      Ninguna parte de este nombre coincide con un club existente -podés crear uno nuevo desde el desplegable de cada regatista.
                    </p>
                  )}
                  {combo.regatistas.map((r) => (
                    <div key={r.id} className="border-t border-border first:border-t-0"><div className="flex items-center justify-between gap-3 py-2">
                      <Link href={`/regatistas/${r.id}`} className="text-sm font-medium hover:text-primary truncate">
                        {r.nombre}
                      </Link>
                      <select
                        className="text-xs bg-background border border-border rounded-md px-2 py-1.5 max-w-[220px]"
                        defaultValue=""
                        disabled={guardando === r.id}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) return;
                          if (value === "__otro__") {
                            e.target.value = "";
                            setNombreNuevo("");
                            setCreandoPara(r.id);
                            return;
                          }
                          if (value === "__ambos__") {
                            reasignar(combo.id, r.id, null, undefined, combo.candidatos.map((c) => c.id));
                            return;
                          }
                          if (value.startsWith("nuevo:")) {
                            reasignar(combo.id, r.id, null, value.slice(6));
                            return;
                          }
                          reasignar(combo.id, r.id, value === "__sin_club__" ? null : value);
                        }}
                      >
                        <option value="" disabled>
                          {guardando === r.id ? "Guardando..." : "Asignar a..."}
                        </option>
                        {combo.candidatos.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                        {combo.candidatos.length >= 2 && (
                          <option value="__ambos__">Asignar a ambos: {combo.candidatos.map((c) => c.nombre).join(" + ")}</option>
                        )}
                        {combo.nuevos.map((n) => (
                          <option key={n} value={`nuevo:${n}`}>Crear club nuevo: {n}</option>
                        ))}
                        <option value="__otro__">Crear club nuevo con otro nombre...</option>
                        <option value="__sin_club__">Sin club</option>
                      </select>
                      </div>
                      {creandoPara === r.id && (
                        <form
                          className="flex items-center gap-2 pb-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const nombre = nombreNuevo.trim();
                            if (nombre.length < 2) return;
                            setCreandoPara(null);
                            reasignar(combo.id, r.id, null, nombre);
                          }}
                        >
                          <input
                            autoFocus
                            value={nombreNuevo}
                            onChange={(e) => setNombreNuevo(e.target.value)}
                            placeholder="Nombre del club nuevo"
                            className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-1.5"
                          />
                          <Button type="submit" size="sm">Crear y asignar</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setCreandoPara(null)}>Cancelar</Button>
                        </form>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
