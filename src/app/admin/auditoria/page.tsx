"use client";

import { useEffect, useState } from "react";
import { ClipboardListIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mensajeDeError } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  actorEmail: string;
  actorNombre: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: Record<string, unknown> | null;
  createdAt: string;
}

// Registro de auditoría de acciones administrativas sensibles (cambios de
// rol, publicar/eliminar campeonatos, fusionar clubes -ver
// registrarAuditoria() en src/lib/auditoria.ts). Antes no quedaba ningún
// rastro de quién hizo qué, algo relevante ahora que hay varios
// ADMIN/ORGANIZADOR con permisos de edición reales.
export default function AdminAuditoriaPage() {
  const [registros, setRegistros] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <ClipboardListIcon className="w-8 h-8 text-primary" />
              Auditoría
            </h1>
            <p className="text-muted-foreground text-lg">
              Últimas {registros.length} acciones administrativas sensibles (roles, campeonatos, clubes).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar} className="gap-2">
            <RefreshCwIcon className="w-4 h-4" /> Actualizar
          </Button>
        </header>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : registros.length === 0 ? (
          <Card className="bg-surface border-border text-center py-12">
            <CardContent><div className="text-muted-foreground">Todavía no hay ninguna acción registrada.</div></CardContent>
          </Card>
        ) : (
          <Card className="bg-surface border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">Fecha</th>
                      <th className="px-6 py-3 font-medium">Quién</th>
                      <th className="px-6 py-3 font-medium">Acción</th>
                      <th className="px-6 py-3 font-medium">Entidad</th>
                      <th className="px-6 py-3 font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {registros.map((r) => (
                      <tr key={r.id} className="hover:bg-background/50 transition-colors align-top">
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleString("es-AR")}
                        </td>
                        <td className="px-6 py-3">
                          <div className="font-medium">{r.actorNombre || r.actorEmail}</div>
                          {r.actorNombre && <div className="text-xs text-muted-foreground">{r.actorEmail}</div>}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs">{r.accion}</td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {r.entidad}{r.entidadId ? ` #${r.entidadId.slice(0, 8)}` : ""}
                        </td>
                        <td className="px-6 py-3 text-xs text-muted-foreground font-mono max-w-xs truncate" title={r.detalle ? JSON.stringify(r.detalle) : ""}>
                          {r.detalle ? JSON.stringify(r.detalle) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
