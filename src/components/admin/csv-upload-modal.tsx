"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadIcon, CheckCircleIcon, AlertCircleIcon, XIcon, Loader2Icon, ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface CsvUploadModalProps {
  campeonatoId: string;
  isOpen: boolean;
  onClose: () => void;
}

type RolColumna = 'puesto' | 'vela' | 'navegante' | 'club' | 'flota' | 'total' | 'regata' | 'personalizada' | 'ignorar';

interface ColumnaSugerida {
  index: number;
  header: string;
  rol: RolColumna;
  nombrePersonalizada?: string;
  muestra: string[];
}

const ROLES: { value: RolColumna; label: string }[] = [
  { value: 'puesto', label: 'Puesto' },
  { value: 'vela', label: 'Vela' },
  { value: 'navegante', label: 'Navegante' },
  { value: 'club', label: 'Club' },
  { value: 'flota', label: 'Flota / Subgrupo' },
  { value: 'total', label: 'Total de puntos' },
  { value: 'regata', label: 'Regata' },
  { value: 'personalizada', label: 'Personalizada...' },
  { value: 'ignorar', label: 'Ignorar esta columna' },
];

// Roles que solo puede tener UNA columna -si el admin le pone "Puesto" a
// una segunda columna, la que la tenía pasa a "Ignorar" para no mandar dos
// columnas con el mismo rol al importador. "Club" es la excepción: en
// tripulaciones de más de una persona a veces el archivo trae una columna
// de club POR tripulante, así que se permite marcar varias -se asignan en
// el orden de las columnas (1ra columna = club del 1er tripulante, etc.).
const ROLES_UNICOS: RolColumna[] = ['puesto', 'vela', 'navegante', 'flota', 'total'];

type Etapa = 'seleccionar' | 'confirmar' | 'importando' | 'exito';

export function CsvUploadModal({ campeonatoId, isOpen, onClose }: CsvUploadModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('seleccionar');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [columnas, setColumnas] = useState<ColumnaSugerida[]>([]);
  const [roles, setRoles] = useState<Record<number, RolColumna>>({});
  // Nombre que va a tener cada columna marcada como "Personalizada" -por
  // defecto el propio encabezado del archivo, editable en la pantalla de
  // confirmación.
  const [nombresPersonalizados, setNombresPersonalizados] = useState<Record<number, string>>({});
  const [totalFilas, setTotalFilas] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFile(null);
    setEtapa('seleccionar');
    setColumnas([]);
    setRoles({});
    setNombresPersonalizados({});
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  // Excel y PDF: primero mostramos qué detectamos en cada columna para que
  // el admin confirme o corrija antes de tocar la base -en un PDF no hay
  // celdas reales, así que vale doblemente la pena revisar antes de subir.
  // CSV sigue el camino directo de siempre: su formato es más rígido y no
  // hace falta el paso extra.
  const necesitaConfirmacion = (f: File) => /\.(xlsx?|pdf)$/i.test(f.name);

  const handleContinuar = async () => {
    if (!file) return;

    if (!necesitaConfirmacion(file)) {
      await importar();
      return;
    }

    setIsLoadingPreview(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/campeonatos/${campeonatoId}/import/preview`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el archivo");

      setColumnas(data.columnas);
      setTotalFilas(data.totalFilas);
      const rolesIniciales: Record<number, RolColumna> = {};
      const nombresIniciales: Record<number, string> = {};
      data.columnas.forEach((c: ColumnaSugerida) => {
        rolesIniciales[c.index] = c.rol;
        if (c.rol === 'personalizada') {
          nombresIniciales[c.index] = c.nombrePersonalizada || c.header || `Columna ${c.index + 1}`;
        }
      });
      setRoles(rolesIniciales);
      setNombresPersonalizados(nombresIniciales);
      setEtapa('confirmar');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const cambiarRol = (index: number, rol: RolColumna) => {
    setRoles((prev) => {
      const next = { ...prev };
      if (ROLES_UNICOS.includes(rol)) {
        // Sacamos ese rol de cualquier otra columna que lo tuviera.
        Object.keys(next).forEach((k) => {
          if (Number(k) !== index && next[Number(k)] === rol) next[Number(k)] = 'ignorar';
        });
      }
      next[index] = rol;
      return next;
    });
    if (rol === 'personalizada' && !nombresPersonalizados[index]?.trim()) {
      const columna = columnas.find((c) => c.index === index);
      setNombresPersonalizados((prev) => ({
        ...prev,
        [index]: columna?.header || `Columna ${index + 1}`,
      }));
    }
  };

  const cambiarNombrePersonalizada = (index: number, nombre: string) => {
    setNombresPersonalizados((prev) => ({ ...prev, [index]: nombre }));
  };

  const construirMapping = () => {
    const buscar = (rol: RolColumna) => {
      const idx = Object.entries(roles).find(([, r]) => r === rol)?.[0];
      return idx !== undefined ? Number(idx) : -1;
    };

    const puestoCol = buscar('puesto');
    const velaCol = buscar('vela');
    const nombreCol = buscar('navegante');
    const totalCol = buscar('total');
    const flotaColRaw = buscar('flota');

    // Puede haber más de una columna de Club (una por tripulante, en
    // tripulaciones de más de una persona) -se ordenan por posición en el
    // archivo: la primera es el club del primer tripulante, etc.
    const clubCols = Object.entries(roles)
      .filter(([, r]) => r === 'club')
      .map(([idx]) => Number(idx))
      .sort((a, b) => a - b);
    const clubCol = clubCols[0] ?? -1;
    const clubColsExtra = clubCols.slice(1);

    if ([puestoCol, velaCol, nombreCol, clubCol, totalCol].includes(-1)) {
      return { error: 'Faltan columnas: Puesto, Vela, Navegante, Club y Total de puntos son obligatorias.' };
    }

    const regataCols = Object.entries(roles)
      .filter(([, r]) => r === 'regata')
      .map(([idx]) => Number(idx))
      .sort((a, b) => a - b)
      .map((colIndex, i) => ({ colIndex, numero: i + 1 }));

    if (regataCols.length === 0) {
      return { error: 'Asigná al menos una columna como "Regata".' };
    }

    const columnasPersonalizadas = Object.entries(roles)
      .filter(([, r]) => r === 'personalizada')
      .map(([idx]) => Number(idx))
      .map((colIndex) => ({
        colIndex,
        nombre: (nombresPersonalizados[colIndex] || columnas.find((c) => c.index === colIndex)?.header || `Columna ${colIndex + 1}`).trim(),
      }));

    if (columnasPersonalizadas.some((c) => c.nombre.length === 0)) {
      return { error: 'Las columnas personalizadas necesitan un nombre.' };
    }

    return {
      mapping: {
        puestoCol, velaCol, nombreCol, clubCol, totalCol,
        clubColsExtra: clubColsExtra.length > 0 ? clubColsExtra : undefined,
        flotaCol: flotaColRaw === -1 ? null : flotaColRaw,
        regataCols,
        columnasPersonalizadas,
      },
    };
  };

  const importar = async (mapping?: object) => {
    if (!file) return;
    setEtapa('importando');
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (mapping) formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch(`/api/campeonatos/${campeonatoId}/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir el archivo");

      setSuccess(data.stats);
      setEtapa('exito');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setEtapa(mapping ? 'confirmar' : 'seleccionar');
    }
  };

  const handleConfirmarImportacion = () => {
    const { mapping, error: mappingError } = construirMapping();
    if (mappingError) {
      setError(mappingError);
      return;
    }
    importar(mapping);
  };

  const isBusy = isLoadingPreview || etapa === 'importando';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {etapa === 'confirmar' ? 'Confirmá las columnas detectadas' : 'Importar Resultados (CSV / Excel / PDF)'}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={isBusy}>
            <XIcon className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {etapa === 'seleccionar' && (
            <>
              <p className="text-sm text-muted-foreground">
                Sube un archivo `.csv`, `.xlsx` o `.pdf` generado por Sailwave para importar los resultados automáticamente.
                Para Excel, en el próximo paso vas a poder revisar y corregir qué detectó en cada columna antes de importar
                nada -no hace falta que el archivo tenga nombres de columna exactos.
              </p>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-background">
                <UploadIcon className="w-10 h-10 text-muted-foreground mb-4" />
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90 cursor-pointer"
                  disabled={isBusy}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                  <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </>
          )}

          {etapa === 'confirmar' && (
            <>
              <p className="text-sm text-muted-foreground">
                Detectamos {totalFilas} filas de datos. Revisá que cada columna tenga asignado lo correcto -marcamos nuestra
                mejor sugerencia, pero nada se guarda hasta que confirmes. Las columnas que no reconocimos quedaron como
                "Personalizada" con el nombre del archivo -se guardan igual y aparecen como columnas extra en la tabla de
                posiciones; podés renombrarlas o pasarlas a "Ignorar" si no hacen falta. Si el archivo trae una columna de
                Club separada por cada tripulante (tripulaciones de 2 o más personas), marcá "Club" en cada una -a
                diferencia de las demás columnas, esta sí se puede repetir, y se asignan en el orden en que aparecen.
              </p>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="text-xs text-left border-collapse w-full">
                  <thead>
                    <tr className="bg-background">
                      {columnas.map((c) => (
                        <th key={c.index} className="border border-border px-2 py-2 align-top min-w-[140px]">
                          <div className="font-medium mb-1 truncate" title={c.header}>{c.header || `Columna ${c.index + 1}`}</div>
                          <select
                            value={roles[c.index] || 'ignorar'}
                            onChange={(e) => cambiarRol(c.index, e.target.value as RolColumna)}
                            className="w-full text-xs bg-surface border border-border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          {roles[c.index] === 'personalizada' && (
                            <input
                              type="text"
                              value={nombresPersonalizados[c.index] ?? ''}
                              onChange={(e) => cambiarNombrePersonalizada(c.index, e.target.value)}
                              placeholder="Nombre de la columna"
                              className="w-full mt-1 text-xs bg-surface border border-border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[0, 1, 2].map((fila) => (
                      <tr key={fila}>
                        {columnas.map((c) => (
                          <td key={c.index} className="border border-border px-2 py-1 whitespace-nowrap">
                            {c.muestra[fila] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                  <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </>
          )}

          {etapa === 'importando' && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Importando...</p>
            </div>
          )}

          {etapa === 'exito' && success && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                <CheckCircleIcon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold">¡Importación Exitosa!</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Regatistas procesados: {success.totalInscritos}</p>
                <p>Regatistas nuevos creados: {success.regatistasNuevos}</p>
                <p>Nuevas regatas añadidas: {success.regatasNuevas}</p>
                <p>Resultados importados: {success.resultadosInsertados}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-between gap-3 bg-muted/20">
          <div>
            {etapa === 'confirmar' && (
              <Button variant="ghost" onClick={() => setEtapa('seleccionar')} disabled={isBusy} className="gap-2">
                <ArrowLeftIcon className="w-4 h-4" /> Volver
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isBusy}>
              {etapa === 'exito' ? "Cerrar" : "Cancelar"}
            </Button>
            {etapa === 'seleccionar' && (
              <Button onClick={handleContinuar} disabled={!file || isBusy}>
                {isLoadingPreview ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    Leyendo archivo...
                  </>
                ) : file && necesitaConfirmacion(file) ? "Continuar" : "Importar Datos"}
              </Button>
            )}
            {etapa === 'confirmar' && (
              <Button onClick={handleConfirmarImportacion} disabled={isBusy}>
                Confirmar e Importar
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
