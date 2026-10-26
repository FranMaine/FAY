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

const ETIQUETA_ACCION: Record<string, string> = {
  "usuario.cambiar_rol": "Cambió el rol de un usuario",
  "usuario.eliminar": "Eliminó una cuenta",
  "usuario.eliminar_propia": "Eliminó su propia cuenta",
  "usuario.quitar_apodo": "Quitó el apodo de un usuario",
  "usuario.registrarse": "Creó su cuenta",
  "perfil.cambiar_apodo": "Cambió su apodo",
  "perfil.cambiar_avisos": "Cambió sus avisos por mail",
  "perfil.cambiar_foto": "Cambió su foto",
  "perfil.quitar_foto": "Quitó su foto",
  "perfil.cambiar_password": "Cambió su contraseña",
  "vinculacion.solicitar": "Pidió vincular su cuenta",
  "vinculacion.aprobar": "Aprobó una vinculación",
  "vinculacion.rechazar": "Rechazó una vinculación",
  "vinculacion.revocar": "Revocó una vinculación",
  "vinculacion.desvincular": "Se desvinculó de su regatista",
  "campeonato.crear": "Creó un campeonato",
  "campeonato.editar": "Editó un campeonato",
  "campeonato.cambiar_estado": "Cambió el estado de un campeonato",
  "campeonato.eliminar": "Eliminó un campeonato",
  "campeonato.importar_resultados": "Importó resultados",
  "campeonato.cambiar_logo": "Cambió el logo de un campeonato",
  "campeonato.quitar_logo": "Quitó el logo de un campeonato",
  "campeonato.avisar_regatistas": "Avisó por mail a los regatistas",
  "regata.crear": "Cargó una regata",
  "regata.editar_resultados": "Editó los resultados de una regata",
  "regatista.crear": "Creó un regatista",
  "regatista.editar": "Editó un regatista",
  "regatista.renombrar": "Renombró un regatista",
  "regatista.cambiar_club": "Cambió el club de un regatista",
  "regatista.fusionar": "Fusionó regatistas",
  "club.crear": "Creó un club",
  "club.editar": "Editó un club",
  "club.eliminar": "Eliminó un club",
  "club.fusionar": "Fusionó clubes",
  "club.auto_eliminar_vacio": "Se eliminó un club vacío",
  "club.cambiar_logo": "Cambió el logo de un club",
  "club.quitar_logo": "Quitó el logo de un club",
};

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
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
              <ClipboardListIcon className="w-8 h-8 text-primary" />
              Auditoría
            </h1>
            <p className="text-muted-foreground text-lg">
              Últimas {registros.length} acciones (cuentas, roles, perfiles, campeonatos, regatas, regatistas, clubes y vinculaciones).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar} className="gap-2">
            <RefreshCwIcon className="w-4 h-4" /> Actualizar
          </Button>
        </header>

        {error && <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md">{error}</div>}

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
                <table className="tabla-tarjetas w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                    <tr>
                      <th scope="col" className="px-3 py-3 sm:px-6 font-medium">Fecha</th>
                      <th scope="col" className="px-3 py-3 sm:px-6 font-medium">Quién</th>
                      <th scope="col" className="px-3 py-3 sm:px-6 font-medium">Acción</th>
                      <th scope="col" className="px-3 py-3 sm:px-6 font-medium">Entidad</th>
                      <th scope="col" className="px-3 py-3 sm:px-6 font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {registros.map((r) => (
                      <tr key={r.id} className="hover:bg-background/50 transition-colors align-top">
                        <td data-label="Fecha" className="fila-completa px-3 py-3 sm:px-6 text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleString("es-AR")}
                        </td>
                        <td data-label="Quién" className="fila-completa px-3 py-3 sm:px-6">
                          <div className="font-medium break-words">{r.actorNombre || r.actorEmail}</div>
                          {r.actorNombre && <div className="text-xs text-muted-foreground break-all">{r.actorEmail}</div>}
                        </td>
                        <td data-label="Acción" className="fila-completa px-3 py-3 sm:px-6 [overflow-wrap:anywhere]">
                          <div className="font-medium">{ETIQUETA_ACCION[r.accion] ?? r.accion}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.accion}</div>
                        </td>
                        <td data-label="Entidad" className="fila-completa px-3 py-3 sm:px-6 text-muted-foreground">
                          {r.entidad}{r.entidadId ? ` #${r.entidadId.slice(0, 8)}` : ""}
                        </td>
                        <td data-label="Detalle" className="fila-completa px-3 py-3 sm:px-6 text-xs text-muted-foreground font-mono [overflow-wrap:anywhere] md:max-w-xs md:truncate" title={r.detalle ? JSON.stringify(r.detalle) : ""}>
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
