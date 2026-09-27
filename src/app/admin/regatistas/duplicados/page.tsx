"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Loader2Icon, MergeIcon, AlertCircleIcon, CheckCircleIcon, UserPlusIcon, SparklesIcon } from "lucide-react";
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

interface ParSimilar {
  clave: string;
  a: RegatistaDup;
  b: RegatistaDup;
}

export default function DuplicadosPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [apellidosSueltos, setApellidosSueltos] = useState<CandidatoApellidoSuelto[]>([]);
  const [nombresSimilares, setNombresSimilares] = useState<ParSimilar[]>([]);
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

  // Sección 3 (nombre parecido): por par, cuál de los dos queda como
  // canónico -tampoco se preselecciona: aunque acá suele ser más obvio
  // que en "apellido suelto" (son solo 2 opciones), sigue siendo una
  // decisión de una persona, no algo que convenga adivinar mal por defecto.
  const [canonicoPorSimilar, setCanonicoPorSimilar] = useState<Record<string, string>>({});
  const [fusionandoSimilar, setFusionandoSimilar] = useState<string | null>(null);

  // Sugerencias de la IA por par (nombre parecido): solo orientan, no fusionan.
  const [sugerenciasSimilar, setSugerenciasSimilar] = useState<Record<string, { mismaPersona: boolean; canonicoId: string | null; confianza: string; motivo: string }>>({});
  const [pidiendoIaSimilar, setPidiendoIaSimilar] = useState<string | null>(null);
  const [errorIaSimilar, setErrorIaSimilar] = useState<Record<string, string>>({});

  // Sugerencias de la IA por apellido suelto (solo orientan: no fusionan nada).
  const [sugerencias, setSugerencias] = useState<Record<string, { candidatoNombre: string | null; confianza: string; motivo: string }>>({});
  const [pidiendoIa, setPidiendoIa] = useState<string | null>(null);
  const [errorIa, setErrorIa] = useState<Record<string, string>>({});

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
      setNombresSimilares(data.nombresSimilares || []);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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

  const sugerirConIa = async (item: CandidatoApellidoSuelto) => {
    const clave = item.suelto.id;
    setPidiendoIa(clave);
    setErrorIa((prev) => ({ ...prev, [clave]: "" }));
    try {
      const res = await fetch("/api/admin/ia/sugerir-apellido-suelto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sueltoId: clave, candidatoIds: item.candidatos.map((c) => c.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo pedir la sugerencia");
      setSugerencias((prev) => ({ ...prev, [clave]: data }));
      // Deja marcado el candidato sugerido; igual hay que apretar "Fusionar".
      if (data.candidatoId) setCandidatoPorSuelto((prev) => ({ ...prev, [clave]: data.candidatoId }));
    } catch (err) {
      setErrorIa((prev) => ({ ...prev, [clave]: mensajeDeError(err) }));
    } finally {
      setPidiendoIa(null);
    }
  };

  const descartarSuelto = (clave: string) => {
    // "No es duplicado": lo sacamos de la lista sin tocar la base -por si
    // el apellido suelto no corresponde a ninguno de los candidatos
    // mostrados (persona distinta que comparte apellido).
    setApellidosSueltos((prev) => prev.filter((x) => x.suelto.id !== clave));
  };

  const fusionarSimilar = async (par: ParSimilar) => {
    const canonicoId = canonicoPorSimilar[par.clave];
    if (!canonicoId) return;
    const otroId = canonicoId === par.a.id ? par.b.id : par.a.id;

    setFusionandoSimilar(par.clave);
    setError(null);
    try {
      const res = await fetch("/api/admin/regatistas/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicoId, duplicadoIds: [otroId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo fusionar");

      setExitos((prev) => [
        `"${par.a.nombre}" y "${par.b.nombre}" fusionados: ${data.resumen.resultadosMovidos} resultado(s) movidos.`,
        ...prev,
      ]);
      setNombresSimilares((prev) => prev.filter((x) => x.clave !== par.clave));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setFusionandoSimilar(null);
    }
  };

  const descartarSimilar = (clave: string) => {
    // Son personas distintas de nombre parecido (ej: dos hermanos, o dos
    // apellidos que casi coinciden) -se saca de la lista sin tocar la base.
    setNombresSimilares((prev) => prev.filter((x) => x.clave !== clave));
  };

  const sugerirConIaSimilar = async (par: ParSimilar) => {
    setPidiendoIaSimilar(par.clave);
    setErrorIaSimilar((prev) => ({ ...prev, [par.clave]: "" }));
    try {
      const res = await fetch("/api/admin/ia/sugerir-nombre-parecido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aId: par.a.id, bId: par.b.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo pedir la sugerencia");
      setSugerenciasSimilar((prev) => ({ ...prev, [par.clave]: data }));
      // Deja marcada la ficha sugerida como canónica; igual hay que apretar "Fusionar".
      if (data.canonicoId) setCanonicoPorSimilar((prev) => ({ ...prev, [par.clave]: data.canonicoId }));
    } catch (err) {
      setErrorIaSimilar((prev) => ({ ...prev, [par.clave]: mensajeDeError(err) }));
    } finally {
      setPidiendoIaSimilar(null);
    }
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
            Tres formas en que la misma persona termina con más de una ficha: nombre repetido tal cual, un campeonato
            que solo trajo el apellido y se cargó como regatista nuevo, o un nombre casi idéntico (falta una palabra o
            está mal tipeado) que no llega a coincidir del todo.
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sugerirConIa(item)}
                              disabled={pidiendoIa === item.suelto.id || fusionandoSuelto === item.suelto.id}
                              className="gap-2"
                            >
                              {pidiendoIa === item.suelto.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                              Sugerir con IA
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => descartarSuelto(item.suelto.id)} disabled={fusionandoSuelto === item.suelto.id}>
                              Ninguno es -descartar
                            </Button>
                          </div>

                          {errorIa[item.suelto.id] && (
                            <p role="alert" className="mt-3 text-sm text-red-500">{errorIa[item.suelto.id]}</p>
                          )}
                          {sugerencias[item.suelto.id] && (
                            <p className="mt-3 rounded-lg border border-border bg-background/50 p-3 text-sm" role="status">
                              <span className="font-medium">
                                {sugerencias[item.suelto.id].candidatoNombre
                                  ? `La IA sugiere: ${sugerencias[item.suelto.id].candidatoNombre} (confianza ${sugerencias[item.suelto.id].confianza}).`
                                  : "La IA no encontró evidencia suficiente."}
                              </span>{" "}
                              <span className="text-muted-foreground">{sugerencias[item.suelto.id].motivo} Es solo una orientación: revisalo antes de fusionar.</span>
                            </p>
                          )}

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

            {/* Sección 3: nombre completo casi idéntico (falta/sobra una
                palabra, o una palabra está mal tipeada) -a diferencia de
                "apellido suelto", acá son siempre pares de a dos, así que
                alcanza con elegir cuál de los dos queda. */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Nombre parecido ({nombresSimilares.length})</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                Dos fichas de nombre completo casi igual -a una le falta o le sobra una palabra, o una palabra está mal
                tipeada. Elegí cuál de las dos queda (la otra se fusiona en esa), o descartá si son dos personas
                distintas que solo comparten parte del nombre.
              </p>
              {nombresSimilares.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl bg-surface/50 text-muted-foreground">
                  <CheckCircleIcon className="w-7 h-7 mb-2 opacity-50" />
                  <p className="text-sm">Sin nombres parecidos pendientes de revisar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {nombresSimilares.map((par) => (
                    <div key={par.clave} className="bg-surface border border-border rounded-2xl p-5">
                      <h3 className="font-semibold mb-3">
                        &quot;{par.a.nombre}&quot; / &quot;{par.b.nombre}&quot;
                      </h3>

                      <div className="space-y-2 mb-4">
                        {[par.a, par.b].map((r) => (
                          <label
                            key={r.id}
                            className="flex flex-wrap items-center gap-3 p-2 rounded-lg hover:bg-background/50 cursor-pointer text-sm"
                          >
                            <input
                              type="radio"
                              name={`similar-${par.clave}`}
                              checked={canonicoPorSimilar[par.clave] === r.id}
                              onChange={() => setCanonicoPorSimilar((prev) => ({ ...prev, [par.clave]: r.id }))}
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

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => fusionarSimilar(par)}
                          disabled={fusionandoSimilar === par.clave || !canonicoPorSimilar[par.clave]}
                          className="gap-2"
                        >
                          {fusionandoSimilar === par.clave ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <MergeIcon className="w-4 h-4" />}
                          Fusionar en la ficha seleccionada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sugerirConIaSimilar(par)}
                          disabled={pidiendoIaSimilar === par.clave || fusionandoSimilar === par.clave}
                          className="gap-2"
                        >
                          {pidiendoIaSimilar === par.clave ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                          Sugerir con IA
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => descartarSimilar(par.clave)} disabled={fusionandoSimilar === par.clave}>
                          Son personas distintas -descartar
                        </Button>
                      </div>

                      {errorIaSimilar[par.clave] && (
                        <p role="alert" className="mt-3 text-sm text-red-500">{errorIaSimilar[par.clave]}</p>
                      )}
                      {sugerenciasSimilar[par.clave] && (
                        <p className="mt-3 rounded-lg border border-border bg-background/50 p-3 text-sm" role="status">
                          <span className="font-medium">
                            {sugerenciasSimilar[par.clave].mismaPersona
                              ? `La IA sugiere: son la misma persona, quedarse con "${
                                  [par.a, par.b].find((r) => r.id === sugerenciasSimilar[par.clave].canonicoId)?.nombre
                                }" (confianza ${sugerenciasSimilar[par.clave].confianza}).`
                              : "La IA sugiere que son personas distintas."}
                          </span>{" "}
                          <span className="text-muted-foreground">{sugerenciasSimilar[par.clave].motivo} Es solo una orientación: revisalo antes de decidir.</span>
                        </p>
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
