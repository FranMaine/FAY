"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusIcon, SaveIcon, UploadIcon, CheckCircleIcon, Loader2Icon, TrashIcon, AlertCircleIcon } from "lucide-react";

import { CsvUploadModal } from "@/components/admin/csv-upload-modal";

interface Resultado {
  id: string;
  puesto: number;
  puntos: number;
  observacion: string | null;
  regatista: { id: string; nombre: string; fuenteIds: any };
}

interface Regata {
  id: string;
  numero: number;
  fecha: string | null;
  condiciones: string | null;
  resultados: Resultado[];
}

interface Campeonato {
  id: string;
  nombre: string;
  anio: number;
  estado: "BORRADOR" | "PUBLICADO";
  descartes: number;
  clase: { nombre: string };
  regatas: Regata[];
}

interface EditRow {
  key: string;
  regatistaId?: string;
  nombre: string;
  vela: string;
  puesto: string;
  puntos: string;
  observacion: string;
}

let rowKeySeq = 0;
const newRowKey = () => `row-${++rowKeySeq}`;

const filaDesdeResultado = (r: Resultado): EditRow => ({
  key: newRowKey(),
  regatistaId: r.regatista.id,
  nombre: r.regatista.nombre,
  vela: (r.regatista.fuenteIds && r.regatista.fuenteIds.vela) || "",
  puesto: String(r.puesto),
  puntos: String(r.puntos),
  observacion: r.observacion || "",
});

export default function AdminCampeonatoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [campeonato, setCampeonato] = useState<Campeonato | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedRegataId, setSelectedRegataId] = useState<string | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [fecha, setFecha] = useState("");
  const [condiciones, setCondiciones] = useState("");

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSavingRegata, setIsSavingRegata] = useState(false);
  const [isCreatingRegata, setIsCreatingRegata] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [descartesInput, setDescartesInput] = useState("0");
  const [isSavingDescartes, setIsSavingDescartes] = useState(false);

  const fetchCampeonato = useCallback(
    async (selectRegataId?: string) => {
      try {
        const res = await fetch(`/api/campeonatos/${id}`);
        if (!res.ok) throw new Error("No se pudo cargar el campeonato");
        const data = await res.json();
        setCampeonato(data.campeonato);
        setDescartesInput(String(data.campeonato.descartes));

        const regatas: Regata[] = data.campeonato.regatas;
        const target = selectRegataId
          ? regatas.find((r) => r.id === selectRegataId)
          : regatas.find((r) => r.id === selectedRegataId) || regatas[0];

        if (target) {
          setSelectedRegataId(target.id);
          setRows(target.resultados.map(filaDesdeResultado));
          setFecha(target.fecha ? target.fecha.slice(0, 10) : "");
          setCondiciones(target.condiciones || "");
        } else {
          setSelectedRegataId(null);
          setRows([]);
          setFecha("");
          setCondiciones("");
        }
      } catch (err: any) {
        setLoadError(err.message || "Error cargando el campeonato");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

  useEffect(() => {
    fetchCampeonato();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const seleccionarRegata = (regata: Regata) => {
    setSelectedRegataId(regata.id);
    setRows(regata.resultados.map(filaDesdeResultado));
    setFecha(regata.fecha ? regata.fecha.slice(0, 10) : "");
    setCondiciones(regata.condiciones || "");
    setSaveError(null);
    setSaveOk(false);
  };

  const agregarFila = () => {
    setRows((prev) => [
      ...prev,
      { key: newRowKey(), nombre: "", vela: "", puesto: "", puntos: "", observacion: "" },
    ]);
    setSaveOk(false);
  };

  const eliminarFila = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setSaveOk(false);
  };

  const editarFila = (key: string, campo: keyof EditRow, valor: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [campo]: valor } : r)));
    setSaveOk(false);
  };

  const handleNuevaRegata = async () => {
    if (!campeonato) return;
    setIsCreatingRegata(true);
    setSaveError(null);
    try {
      const siguienteNumero = campeonato.regatas.length > 0
        ? Math.max(...campeonato.regatas.map((r) => r.numero)) + 1
        : 1;

      const res = await fetch(`/api/campeonatos/${id}/regatas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regataNumero: siguienteNumero, resultados: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la regata");

      await fetchCampeonato(data.id);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsCreatingRegata(false);
    }
  };

  const handleGuardar = async () => {
    if (!selectedRegataId) return;
    setSaveError(null);
    setSaveOk(false);

    const filasValidas = rows.filter((r) => r.nombre.trim());
    for (const r of filasValidas) {
      if (!r.puesto.trim() || !r.puntos.trim()) {
        setSaveError(`Falta puesto o puntos para "${r.nombre}"`);
        return;
      }
    }

    setIsSavingRegata(true);
    try {
      const res = await fetch(`/api/regatas/${selectedRegataId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fecha || null,
          condiciones: condiciones || null,
          resultados: filasValidas.map((r) => ({
            regatistaId: r.regatistaId,
            nombre: r.regatistaId ? undefined : r.nombre.trim(),
            vela: r.vela || undefined,
            puesto: parseInt(r.puesto, 10),
            puntos: parseFloat(r.puntos),
            observacion: r.observacion || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la regata");

      await fetchCampeonato(selectedRegataId);
      setSaveOk(true);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSavingRegata(false);
    }
  };

  const handleGuardarDescartes = async () => {
    if (!campeonato) return;
    const valor = parseInt(descartesInput, 10);
    if (isNaN(valor) || valor < 0) {
      setSaveError("Descartes tiene que ser un número mayor o igual a 0");
      return;
    }
    setIsSavingDescartes(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/campeonatos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descartes: valor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el descarte");
      setCampeonato((prev) => (prev ? { ...prev, descartes: data.descartes } : prev));
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSavingDescartes(false);
    }
  };

  const handlePublicar = async () => {
    if (!campeonato) return;
    setIsPublishing(true);
    setSaveError(null);
    try {
      const nuevoEstado = campeonato.estado === "PUBLICADO" ? "BORRADOR" : "PUBLICADO";
      const res = await fetch(`/api/campeonatos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar el estado");
      setCampeonato((prev) => (prev ? { ...prev, estado: data.estado } : prev));
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  if (loadError || !campeonato) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-red-500">{loadError || "Campeonato no encontrado"}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Carga de Resultados</h1>
              <Badge
                variant="muted"
                className={campeonato.estado === "PUBLICADO" ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500"}
              >
                {campeonato.estado}
              </Badge>
            </div>
            <p className="text-muted-foreground">{campeonato.nombre} • {campeonato.clase.nombre}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={handleNuevaRegata} disabled={isCreatingRegata}>
              {isCreatingRegata ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : <PlusIcon className="w-4 h-4 mr-2" />}
              Nueva Regata
            </Button>
            <Button variant="secondary" onClick={() => setIsCsvModalOpen(true)}>
              <UploadIcon className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
            <Button
              className={campeonato.estado === "PUBLICADO"
                ? "flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                : "flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"}
              onClick={handlePublicar}
              disabled={isPublishing}
            >
              {isPublishing ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
              {campeonato.estado === "PUBLICADO" ? "Volver a Borrador" : "Publicar Campeonato"}
            </Button>
          </div>
        </header>

        <div className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3 w-fit">
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            Descartes (peores regatas que no cuentan en el total)
          </label>
          <Input
            type="number"
            min="0"
            value={descartesInput}
            onChange={(e) => setDescartesInput(e.target.value)}
            className="h-8 w-20 bg-background border-border"
          />
          <Button size="sm" variant="secondary" onClick={handleGuardarDescartes} disabled={isSavingDescartes}>
            {isSavingDescartes ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold">Regatas Existentes</h2>
            <Card className="bg-surface border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {campeonato.regatas.map((regata) => (
                    <div
                      key={regata.id}
                      onClick={() => seleccionarRegata(regata)}
                      className={`p-4 flex justify-between items-center hover:bg-background/50 cursor-pointer ${
                        selectedRegataId === regata.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <span className={`font-medium ${selectedRegataId === regata.id ? "text-primary" : ""}`}>
                        Regata {regata.numero}
                      </span>
                      <Badge variant="muted">{regata.resultados.length} regatistas</Badge>
                    </div>
                  ))}
                  <div
                    onClick={handleNuevaRegata}
                    className="p-4 flex justify-between items-center hover:bg-background/50 cursor-pointer text-muted-foreground"
                  >
                    <span className="font-medium flex items-center gap-2">
                      <PlusIcon className="w-4 h-4" /> Nueva Regata
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {!selectedRegataId ? (
              <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
                Este campeonato todavía no tiene regatas. Creá una con &quot;Nueva Regata&quot; o importá un archivo.
              </div>
            ) : (
              <Card className="bg-surface border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
                  <div>
                    <CardTitle>Editar Regata {campeonato.regatas.find((r) => r.id === selectedRegataId)?.numero}</CardTitle>
                    <CardDescription>Carga de resultados manuales</CardDescription>
                  </div>
                  <Button size="sm" className="flex items-center gap-2" onClick={handleGuardar} disabled={isSavingRegata}>
                    {isSavingRegata ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                    Guardar
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  {saveError && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md mb-4">
                      <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <p>{saveError}</p>
                    </div>
                  )}
                  {saveOk && (
                    <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-md mb-4">
                      <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <p>Guardado.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Fecha</label>
                      <Input
                        type="date"
                        className="bg-background border-border"
                        value={fecha}
                        onChange={(e) => { setFecha(e.target.value); setSaveOk(false); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Condiciones</label>
                      <Input
                        placeholder="Ej: 15 nudos SE"
                        className="bg-background border-border"
                        value={condiciones}
                        onChange={(e) => { setCondiciones(e.target.value); setSaveOk(false); }}
                      />
                    </div>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium">Regatista</th>
                          <th className="px-4 py-3 font-medium w-24">Vela</th>
                          <th className="px-4 py-3 font-medium w-24">Puesto</th>
                          <th className="px-4 py-3 font-medium w-24">Puntos</th>
                          <th className="px-4 py-3 font-medium w-32">Obs (UFD, etc)</th>
                          <th className="px-2 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((row) => (
                          <tr key={row.key} className="bg-background">
                            <td className="px-4 py-2">
                              {row.regatistaId ? (
                                // El nombre de un regatista ya vinculado se
                                // edita desde "Gestión de Regatistas", no
                                // desde acá -escribir algo distinto acá se
                                // interpretaría como "buscar/crear otro
                                // regatista", no como corregir este.
                                <span className="h-8 flex items-center px-3 text-foreground">{row.nombre}</span>
                              ) : (
                                <Input
                                  value={row.nombre}
                                  onChange={(e) => editarFila(row.key, "nombre", e.target.value)}
                                  placeholder="Nombre del regatista"
                                  className="h-8 border-transparent focus:border-primary bg-transparent"
                                />
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={row.vela}
                                onChange={(e) => editarFila(row.key, "vela", e.target.value)}
                                className="h-8 border-transparent focus:border-primary bg-transparent"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                value={row.puesto}
                                onChange={(e) => editarFila(row.key, "puesto", e.target.value)}
                                className="h-8 border-transparent focus:border-primary bg-transparent"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                value={row.puntos}
                                onChange={(e) => editarFila(row.key, "puntos", e.target.value)}
                                className="h-8 border-transparent focus:border-primary bg-transparent"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={row.observacion}
                                onChange={(e) => editarFila(row.key, "observacion", e.target.value)}
                                className="h-8 border-transparent focus:border-primary bg-transparent text-red-500 font-medium"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => eliminarFila(row.key)}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-2 bg-background border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground flex items-center justify-center gap-2 hover:bg-surface"
                        onClick={agregarFila}
                      >
                        <PlusIcon className="w-4 h-4" /> Agregar fila
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <CsvUploadModal
        campeonatoId={id}
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          fetchCampeonato();
        }}
      />
    </main>
  );
}
