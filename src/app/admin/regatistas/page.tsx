"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, AlertTriangleIcon } from "lucide-react";

const mockRegatistas = [
  { id: "1", nombre: "Juan Pérez", club: "YCA", pais: "ARG", clasePrimaria: "Optimist" },
  { id: "2", nombre: "María Gómez", club: "CNSI", pais: "ARG", clasePrimaria: "ILCA 6" },
  { id: "3", nombre: "Pedro Alonso", club: "CVB", pais: "ARG", clasePrimaria: "29er" },
];

export default function AdminRegatistasPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Gestión de Regatistas</h1>
            <p className="text-muted-foreground text-lg">Administración de la base de datos central de regatistas</p>
          </div>
          <Button className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Nuevo Regatista
          </Button>
        </header>

        {/* Duplicados Banner Placeholder */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-4">
          <AlertTriangleIcon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-500">Posibles Duplicados Detectados</h3>
            <p className="text-sm text-amber-500/80 mt-1">
              El sistema detectó 5 casos de posibles regatistas duplicados (nombres similares). 
              Se requiere revisión manual para unificar historiales.
            </p>
            <Button variant="secondary" size="sm" className="mt-3 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:text-amber-500">
              Revisar Duplicados
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, club..." className="pl-9 bg-surface border-border" />
          </div>
          <select className="bg-surface border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary h-10 w-full md:w-48 text-foreground">
            <option>Todas las clases</option>
            <option>Optimist</option>
            <option>ILCA 6</option>
          </select>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Club</th>
                  <th className="px-6 py-4 font-medium">País</th>
                  <th className="px-6 py-4 font-medium">Clase Principal</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockRegatistas.map((r) => (
                  <tr key={r.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{r.nombre}</td>
                    <td className="px-6 py-4">{r.club}</td>
                    <td className="px-6 py-4">{r.pais}</td>
                    <td className="px-6 py-4">{r.clasePrimaria}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500">
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border bg-background/50 flex justify-between items-center text-sm text-muted-foreground">
            <span>Mostrando 3 de 1,204 regatistas</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled>Anterior</Button>
              <Button variant="secondary" size="sm" className="text-foreground">Siguiente</Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

