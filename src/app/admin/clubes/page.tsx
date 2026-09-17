"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, Loader2Icon, MergeIcon, RefreshCwIcon } from "lucide-react";
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
}

interface ClubCnp {
  id: string;
  nombre: string;
  regatistas: RegatistaItem[];
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
  const [clubesCnp, setClubesCnp] = useState<ClubCnp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clubes/combos");
      if (!res.ok) throw new Error("No se pudo cargar la lista");
      const data = await res.json();
      setCombos(data.combos);
      setClubesCnp(data.clubesCnp);
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

  async function reasignar(comboId: string, regatistaId: string, clubId: string | null) {
    setGuardando(regatistaId);
    try {
      const res = await fetch(`/api/admin/regatistas/${regatistaId}/club`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      if (!res.ok) throw new Error("No se pudo reasignar");
      // Sacamos al regatista de la lista del combo en el estado local -si
      // era el último, el combo entero desaparece de la vista (ya no tiene
      // nada pendiente de resolver acá).
      setCombos((prev) =>
        prev
          .map((c) => (c.id === comboId ? { ...c, regatistas: c.regatistas.filter((r) => r.id !== regatistaId) } : c))
          .filter((c) => c.regatistas.length > 0)
      );
    } catch (err) {
      alert(mensajeDeError(err));
    } finally {
      setGuardando(null);
    }
  }

  async function fusionarEnCnp(duplicadoId: string) {
    const cnpBase = clubesCnp.find((c) => c.nombre.trim().toUpperCase() === "CNP");
    if (!cnpBase) return;
    setGuardando(duplicadoId);
    try {
      const res = await fetch("/api/admin/clubes/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicoId: cnpBase.id, duplicadoIds: [duplicadoId] }),
      });
      if (!res.ok) throw new Error("No se pudo fusionar");
      await cargar();
    } catch (err) {
      alert(mensajeDeError(err));
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
          <Button variant="outline" size="sm" onClick={cargar} className="gap-2">
            <RefreshCwIcon className="w-4 h-4" /> Actualizar
          </Button>
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
                      No se encontró ningún club existente que coincida con las partes de este nombre -solo se puede dejar como está o sacar el club.
                    </p>
                  )}
                  {combo.regatistas.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-t border-border first:border-t-0">
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
                          reasignar(combo.id, r.id, value === "__sin_club__" ? null : value);
                        }}
                      >
                        <option value="" disabled>
                          {guardando === r.id ? "Guardando..." : "Asignar a..."}
                        </option>
                        {combo.candidatos.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                        <option value="__sin_club__">Sin club</option>
                      </select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Sigla ambigua: &quot;CNP&quot;</h2>
            <p className="text-sm text-muted-foreground">
              La base tiene dos nombres completos distintos para la sigla &quot;CNP&quot; (Club Náutico Paraná y Cofradía Náutica del Pacífico) -no se puede saber cuál corresponde al CNP real sin más información.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {clubesCnp.map((c) => {
              const esBase = c.nombre.trim().toUpperCase() === "CNP";
              return (
                <Card key={c.id} className={`bg-surface border-border ${esBase ? "border-primary/50" : ""}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{c.nombre}</CardTitle>
                    <CardDescription>{c.regatistas.length} regatista{c.regatistas.length === 1 ? "" : "s"}</CardDescription>
                  </CardHeader>
                  {!esBase && (
                    <CardContent>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        disabled={guardando === c.id}
                        onClick={() => fusionarEnCnp(c.id)}
                      >
                        {guardando === c.id ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <MergeIcon className="w-3.5 h-3.5" />}
                        Fusionar en CNP
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
