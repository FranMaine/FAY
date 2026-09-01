"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckIcon, XIcon } from "lucide-react";

export default function SolicitudesAdminPage() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const res = await fetch("/api/admin/solicitudes");
      const data = await res.json();
      setSolicitudes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'APROBAR' | 'RECHAZAR') => {
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!res.ok) {
        throw new Error("Error procesando solicitud");
      }

      alert(`Solicitud ${action.toLowerCase()} exitosamente`);
      fetchSolicitudes();
    } catch (error) {
      alert("Ocurrió un error");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Vinculación</h1>
        <p className="text-muted-foreground mt-2">Revisá las peticiones de los usuarios para reclamar perfiles de regatistas.</p>
      </div>

      <Card className="bg-surface border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No hay solicitudes pendientes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-surface border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Reclama el perfil de</th>
                    <th className="px-6 py-4 font-medium">Club</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {solicitudes.map((solicitud) => (
                    <tr key={solicitud.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{solicitud.user.name || 'Sin nombre'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{solicitud.user.email}</td>
                      <td className="px-6 py-4 font-bold text-primary">{solicitud.regatista.nombre}</td>
                      <td className="px-6 py-4 text-muted-foreground">{solicitud.regatista.club?.nombre || '-'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                          onClick={() => handleAction(solicitud.id, 'APROBAR')}
                        >
                          <CheckIcon className="w-4 h-4 mr-1" /> Aprobar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                          onClick={() => handleAction(solicitud.id, 'RECHAZAR')}
                        >
                          <XIcon className="w-4 h-4 mr-1" /> Rechazar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
