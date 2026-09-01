"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, EditIcon, TrashIcon, EyeIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { NuevoCampeonatoModal } from "@/components/admin/nuevo-campeonato-modal";

interface Campeonato {
  id: string;
  nombre: string;
  anio: number;
  estado: "BORRADOR" | "PUBLICADO";
  clase: { id: string; nombre: string };
}

interface Clase {
  id: string;
  nombre: string;
}

export default function AdminCampeonatosPage() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [campeonatosRes, clasesRes] = await Promise.all([
        fetch("/api/campeonatos"),
        fetch("/api/clases"),
      ]);
      setCampeonatos(await campeonatosRes.json());
      setClases(await clasesRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Gestión de Campeonatos</h1>
            <p className="text-muted-foreground text-lg">Administrá los campeonatos del sistema</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="w-4 h-4" /> Nuevo Campeonato
          </Button>
        </header>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Año</th>
                  <th className="px-6 py-4 font-medium">Clase</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <Loader2Icon className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : campeonatos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      Todavía no hay campeonatos cargados.
                    </td>
                  </tr>
                ) : (
                  campeonatos.map((c) => (
                    <tr key={c.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{c.nombre}</td>
                      <td className="px-6 py-4">{c.anio}</td>
                      <td className="px-6 py-4">{c.clase?.nombre}</td>
                      <td className="px-6 py-4">
                        <Badge variant={c.estado === "PUBLICADO" ? "default" : "muted"} className={
                          c.estado === "PUBLICADO" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                        }>
                          {c.estado}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link href={`/admin/campeonatos/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/campeonatos/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
                            <EditIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" disabled>
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NuevoCampeonatoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchData}
        clases={clases}
      />
    </main>
  );
}
