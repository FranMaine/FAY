"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Loader2Icon, MergeIcon, AlertCircleIcon, CheckCircleIcon, UserPlusIcon } from "lucide-react";
import { mensajeDeError } from "@/lib/utils";

interface RegatistaDup {
  id: string;
  nombre: string;
  club: string | null;
  resultadosCount: number;
  createdAt: string;
}

interface Grupo {
  nombreNormalizado: string;
  regatistas: RegatistaDup[];
}

interface CandidatoApellidoSuelto {
  suelto: RegatistaDup;
  candidatos: RegatistaDup[];
}

export default function DuplicadosPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [apellidosSueltos, setApellidosSueltos] = useState<CandidatoApellidoSuelto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sección 1 (nombre idéntico): por grupo, qué id quedó elegido como canónico.
  const [canonicoPorGrupo, setCanonicoPorGrupo] = useState<Record<string, string>>({});
  const [fusionandoGrupo, setFusionandoGrupo] = useState<string | null>(null);
  // Mensajes de lo ya resuelto: se muestran arriba en una lista propia, no
  // dentro de la tarjeta (que desaparece al resolverse). Antes se guardaban
  // por posicion en la lista y, al borrarse una tarjeta, el aviso caia en la
  // siguiente.
  const [exitos, setExitos] = useState<string[]>([]);

  // Sección 2 (apellido suelto): por ítem, qué candidato quedó elegido -acá
  // arranca SIN preselección (a diferencia de los grupos de arriba): con
  // varios candidatos plausibles para el mismo apellido, sugerir "el más
  // viejo" a ciegas podría fusionar con la persona equivocada.
  const [candidatoPorSuelto, setCandidatoPorSuelto] = useState<Record<string, string>>({});
  const [fusionandoSuelto, setFusionandoSuelto] = useState<string | null>(null);

  // "Crear como nuevo regatista": cuando ninguno de los candidatos es la
  // persona correcta pero el admin averiguó el nombre completo real (por
  // ejemplo, mirando la planilla original del campeonato), esto completa
  // la ficha existente en vez de dejarla para siempre como una sola
  // palabra. Un Set de índices "abiertos" controla en qué filas se
  // muestra el campo de texto (colapsado por default, para no
  // amontonar un input por cada una de golpe).
  const [creandoNuevoAbierto, setCreandoNuevoAbierto] = useState<Set<string>>(new Set());
  const [nombreNuevoPorSuelto, setNombreNuevoPorSuelto] = useState<Record<string, string>>({});
  const [creandoNuevo, setCreandoNuevo] = useState<string | null>(null);

  const fetchDatos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regatistas/duplicados");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la lista");

      setGrupos(data.grupos || []);
      // Por defecto, el canónico sugerido es el más viejo (primer creado) -
      // acá no hay ambigüedad (mismo nombre normalizado = misma persona),
      // así que sugerir uno de entrada ahorra un click en el caso típico.
      const iniciales: Record<string, string> = {};
      (data.grupos || []).forEach((g: Grupo) => {
        iniciales[g.nombreNormalizado] = g.regatistas[0]?.id;
      });
      setCanonicoPorGrupo(iniciales);

      setApellidosSueltos(data.apellidosSueltos || []);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDatos();
  }, [fetchDatos]);

  const fusionarGrupo = async (grupo: Grupo) => {
    const clave = grupo.nombreNormalizado;
    const canonicoId = canonicoPorGrupo[clave];
    if (!canonicoId) return;

    const duplicadoIds = grupo.regatistas.map((r) => r.id).filter((id) => id !== canonicoId);
    if (duplicadoIds.length === 0) return;

    setFusionandoGrupo(clave);
    setError(null);
    try {
      const res = await fetch("/api/admin/regatistas/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicoId, duplicadoIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo fusionar");

      setExitos((prev) => [
        `"${grupo.regatistas[0]?.nombre}": ${data.resumen.resultadosMovidos} resultado(s) movidos, ${data.resumen.duplicadosBorrados} ficha(s) duplicada(s) borrada(s).`,
        ...prev,
      ]);
      setGrupos((prev) => prev.filter((g) => g.nombreNormalizado !== clave));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setFusionandoGrupo(null);
    }
  };

  const fusionarSuelto = async (item: CandidatoApellidoSuelto) => {
    const clave = item.suelto.id;
    const canonicoId = candidatoPorSuelto[clave];
    if (!canonicoId) return;

    setFusionandoSuelto(clave);
    setError(null);
    try {
      const res = await fetch("/api/admin/regatistas/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicoId, duplicadoIds: [item.suelto.id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo fusionar");

      setExitos((prev) => [
        `"${item.suelto.nombre}" fusionado con "${item.candidatos.find((c) => c.id === canonicoId)?.nombre}": ${data.resumen.resultadosMovidos} resultado(s) movidos.`,
        ...prev,
      ]);
      setApellidosSueltos((prev) => prev.filter((x) => x.suelto.id !== clave));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setFusionandoSuelto(null);
    }
  };

  const crearNuevoRegatista = async (item: CandidatoApellidoSuelto) => {
    const clave = item.suelto.id;
    const nombre = (nombreNuevoPorSuelto[clave] || "").trim();
    if (nombre.length < 2) return;

    setCreandoNuevo(clave);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regatistas/${item.suelto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo renombrar");

      setExitos((prev) => [`"${item.suelto.nombre}" confirmado como persona nueva: "${nombre}".`, ...prev]);
      setApellidosSueltos((prev) => prev.filter((x) => x.suelto.id !== clave));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCreandoNuevo(null);
    }
  };

  const descartarSuelto = (clave: string) => {
    // "No es duplicado": lo sacamos de la lista sin tocar la base -por si
    // el apellido suelto no corresponde a ninguno de los candidatos
    // mostrados (persona distinta que comparte apellido).
    setApellidosSueltos((prev) => prev.filter((x) => x.suelto.id !== clave));
  };

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <Link href="/admin/regatistas">
            <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Volver a Regatistas
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Regatistas Duplicados</h1>
          <p className="text-muted-foreground">
            Dos formas en que la misma persona termina con más de una ficha: nombre repetido tal cual, o un campeonato
            que solo trajo el apellido y se cargó como regatista nuevo en vez de reconocer al que ya existía.
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {exitos.length > 0 && (
          <div className="space-y-1 rounded-2xl border border-green-500/30 bg-green-500/10 p-4" role="status">
            {exitos.map((m, i) => (
              <p key={i} className="text-sm text-green-500 flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 mt-0.5 shrink-0" /> {m}
              </p>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Sección 1: nombre normalizado idéntico -no hay ambigüedad,
                todas las fichas del grupo son la misma persona. */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Mismo nombre ({grupos.length})</h2>
              {grupos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl bg-surface/50 text-muted-foreground">
                  <CheckCircleIcon className="w-7 h-7 mb-2 opacity-50" />
                  <p className="text-sm">Sin duplicados de nombre idéntico.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {grupos.map((grupo) => (
                    <div key={grupo.nombreNormalizado} className="bg-surface border border-border rounded-2xl p-5">
                      <h3 className="font-semibold mb-3">{grupo.regatistas[0]?.nombre}</h3>

                      {(
                        <>
                          <div className="space-y-2 mb-4">
                            {grupo.regatistas.map((r) => (
                              <label
                                key={r.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 cursor-pointer text-sm"
                              >
                                <input
                                  type="radio"
                                  name={`canonico-${grupo.nombreNormalizado}`}
                                  checked={canonicoPorGrupo[grupo.nombreNormalizado] === r.id}
                                  onChange={() => setCanonicoPorGrupo((prev) => ({ ...prev, [grupo.nombreNormalizado]: r.id }))}
                                  className="accent-primary"
                                />
                                <span className="font-medium">{r.nombre}</span>
                                <span className="text-muted-foreground">club: {r.club || "-"}</span>
                                <span className="text-muted-foreground">{r.resultadosCount} resultado(s)</span>
                                <span className="text-xs text-muted-foreground">
                                  creado {new Date(r.createdAt).toLocaleDateString("es-AR")}
                                </span>
                              </label>
                            ))}
                          </div>
                          <Button size="sm" onClick={() => fusionarGrupo(grupo)} disabled={fusionandoGrupo === grupo.nombreNormalizado} className="gap-2">
                            {fusionandoGrupo === grupo.nombreNormalizado ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <MergeIcon className="w-4 h-4" />}
                            Fusionar en la ficha seleccionada
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sección 2: apellido suelto -puede haber más de un candidato
                plausible (personas distintas que comparten apellido), así
                que NO se preselecciona nada: hay que elegir a mano cuál es
                la persona correcta, o descartar si ninguno lo es. */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Apellido suelto ({apellidosSueltos.length})</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                Nombre de una sola palabra que coincide con el apellido de otro regatista de nombre completo. Elegí cuál
                de los candidatos es la misma persona (o descartá si ninguno lo es -puede ser alguien distinto que
                comparte apellido).
              </p>
              {apellidosSueltos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl bg-surface/50 text-muted-foreground">
                  <CheckCircleIcon className="w-7 h-7 mb-2 opacity-50" />
                  <p className="text-sm">Sin apellidos sueltos pendientes de revisar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apellidosSueltos.map((item) => (
                    <div key={item.suelto.id} className="bg-surface border border-border rounded-2xl p-5">
                      <h3 className="font-semibold mb-1">&quot;{item.suelto.nombre}&quot;</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        club: {item.suelto.club || "-"} · {item.suelto.resultadosCount} resultado(s)
                      </p>

                      {(
                        <>
                          <div className="space-y-2 mb-4">
                            {item.candidatos.map((c) => (
                              <label
                                key={c.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 cursor-pointer text-sm"
                              >
                                <input
                                  type="radio"
                                  name={`suelto-${item.suelto.id}`}
                                  checked={candidatoPorSuelto[item.suelto.id] === c.id}
                                  onChange={() => setCandidatoPorSuelto((prev) => ({ ...prev, [item.suelto.id]: c.id }))}
                                  className="accent-primary"
                                />
                                <span className="font-medium">{c.nombre}</span>
                                <span className="text-muted-foreground">club: {c.club || "-"}</span>
                                <span className="text-muted-foreground">{c.resultadosCount} resultado(s)</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => fusionarSuelto(item)}
                              disabled={fusionandoSuelto === item.suelto.id || !candidatoPorSuelto[item.suelto.id]}
                              className="gap-2"
                            >
                              {fusionandoSuelto === item.suelto.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <MergeIcon className="w-4 h-4" />}
                              Fusionar con el elegido
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setCreandoNuevoAbierto((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.suelto.id)) next.delete(item.suelto.id);
                                  else next.add(item.suelto.id);
                                  return next;
                                })
                              }
                              disabled={fusionandoSuelto === item.suelto.id}
                              className="gap-2"
                            >
                              <UserPlusIcon className="w-4 h-4" />
                              Crear como nuevo regatista
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => descartarSuelto(item.suelto.id)} disabled={fusionandoSuelto === item.suelto.id}>
                              Ninguno es -descartar
                            </Button>
                          </div>

                          {creandoNuevoAbierto.has(item.suelto.id) && (
                            <div className="flex flex-wrap items-center gap-2 mt-3 p-3 rounded-lg bg-background/50 border border-border">
                              <p className="text-xs text-muted-foreground w-full">
                                Ninguno de los candidatos es &quot;{item.suelto.nombre}&quot; -si ya sabés el nombre
                                completo real (por ejemplo, mirando la planilla original), completalo acá para que
                                deje de ser un apellido suelto:
                              </p>
                              <input
                                type="text"
                                placeholder="Nombre completo real"
                                value={nombreNuevoPorSuelto[item.suelto.id] || ""}
                                onChange={(e) => setNombreNuevoPorSuelto((prev) => ({ ...prev, [item.suelto.id]: e.target.value }))}
                                className="flex-1 min-w-[200px] text-sm bg-surface border border-border rounded-md px-3 py-1.5"
                              />
                              <Button
                                size="sm"
                                onClick={() => crearNuevoRegatista(item)}
                                disabled={creandoNuevo === item.suelto.id || (nombreNuevoPorSuelto[item.suelto.id] || "").trim().length < 2}
                                className="gap-2"
                              >
                                {creandoNuevo === item.suelto.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <UserPlusIcon className="w-4 h-4" />}
                                Confirmar
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
