"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusIcon, SaveIcon, UploadIcon, CheckCircleIcon } from "lucide-react";

import { CsvUploadModal } from "@/components/admin/csv-upload-modal";

import { use } from "react";

export default function AdminCampeonatoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Mock data
  const campeonato = {
    nombre: "Semana de Buenos Aires",
    clase: "Optimist",
    estado: "BORRADOR",
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Carga de Resultados</h1>
              <Badge variant="muted" className="bg-amber-500/20 text-amber-500">{campeonato.estado}</Badge>
            </div>
            <p className="text-muted-foreground">{campeonato.nombre} • {campeonato.clase}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">
              <PlusIcon className="w-4 h-4 mr-2" />
              Nueva Regata
            </Button>
            <Button variant="secondary" onClick={() => setIsCsvModalOpen(true)}>
              <UploadIcon className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
            <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircleIcon className="w-4 h-4" /> Publicar Campeonato
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold">Regatas Existentes</h2>
            <Card className="bg-surface border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div className="p-4 flex justify-between items-center hover:bg-background/50 cursor-pointer">
                    <span className="font-medium">Regata 1</span>
                    <Badge variant="muted">45 regatistas</Badge>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-background/50 cursor-pointer bg-primary/5 border-l-2 border-l-primary">
                    <span className="font-medium text-primary">Regata 2</span>
                    <Badge variant="muted">45 regatistas</Badge>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-background/50 cursor-pointer text-muted-foreground">
                    <span className="font-medium flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Nueva Regata</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-surface border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
                <div>
                  <CardTitle>Editar Regata 2</CardTitle>
                  <CardDescription>Carga de resultados manuales</CardDescription>
                </div>
                <Button size="sm" className="flex items-center gap-2">
                  <SaveIcon className="w-4 h-4" /> Guardar
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Fecha</label>
                    <Input type="date" className="bg-background border-border" defaultValue="2024-10-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Condiciones</label>
                    <Input placeholder="Ej: 15 nudos SE" className="bg-background border-border" />
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-background">
                        <td className="px-4 py-2"><Input defaultValue="Juan Pérez" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input defaultValue="ARG 1234" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input type="number" defaultValue="1" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input type="number" defaultValue="1" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-2"><Input defaultValue="María Gómez" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input defaultValue="ARG 4321" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input type="number" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input type="number" defaultValue="46" className="h-8 border-transparent focus:border-primary bg-transparent" /></td>
                        <td className="px-4 py-2"><Input defaultValue="UFD" className="h-8 border-transparent focus:border-primary bg-transparent text-red-500 font-medium" /></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-2 bg-background border-t border-border">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground flex items-center justify-center gap-2 hover:bg-surface">
                      <PlusIcon className="w-4 h-4" /> Agregar fila
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CsvUploadModal 
        campeonatoId={id} 
        isOpen={isCsvModalOpen} 
        onClose={() => setIsCsvModalOpen(false)} 
      />
    </main>
  );
}
