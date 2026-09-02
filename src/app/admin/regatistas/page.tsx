"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, PlusIcon, EditIcon, Loader2Icon } from "lucide-react";
import { RegatistaModal } from "@/components/admin/regatista-modal";

interface Regatista {
  id: string;
  nombre: string;
  pais: string | null;
  club: { nombre: string } | null;
}

const PAGE_SIZE = 20;

export default function AdminRegatistasPage() {
  const [regatistas, setRegatistas] = useState<Regatista[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Regatista | null>(null);

  const fetchRegatistas = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/regatistas?${params.toString()}`);
      const data = await res.json();
      setRegatistas(data.regatistas || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchRegatistas();
  }, [fetchRegatistas]);

  // Al buscar, volvemos siempre a la primera página.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const abrirNuevo = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (r: Regatista) => {
    setEditing(r);
    setIsModalOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Gestión de Regatistas</h1>
            <p className="text-muted-foreground text-lg">Administración de la base de datos central de regatistas</p>
          </div>
          <Button className="flex items-center gap-2" onClick={abrirNuevo}>
            <PlusIcon className="w-4 h-4" /> Nuevo Regatista
          </Button>
        </header>

        {/*
          La detección de duplicados (nombres similares que en realidad son
          la misma persona) necesita un algoritmo de comparación difuso y una
          pantalla de revisión/merge propia -no está implementada todavía,
          así que no mostramos un banner que prometa un número inventado.
        */}

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              className="pl-9 bg-surface border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Club</th>
                  <th className="px-6 py-4 font-medium">País</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <Loader2Icon className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : regatistas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      No se encontraron regatistas.
                    </td>
                  </tr>
                ) : (
                  regatistas.map((r) => (
                    <tr key={r.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{r.nombre}</td>
                      <td className="px-6 py-4">{r.club?.nombre || "-"}</td>
                      <td className="px-6 py-4">{r.pais || "-"}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-accent"
                          onClick={() => abrirEditar(r)}
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        {/*
                          Borrar un regatista implica decidir qué pasa con su
                          historial de resultados y con su vínculo de cuenta,
                          si tiene uno -no es una operación segura para hacer
                          con un click sin esa lógica definida, así que no
                          hay botón de eliminar todavía.
                        */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border bg-background/50 flex justify-between items-center text-sm text-muted-foreground">
            <span>
              {total === 0
                ? "0 regatistas"
                : `Mostrando ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} de ${total} regatistas`}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-foreground"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>

      <RegatistaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchRegatistas}
        regatista={editing}
      />
    </main>
  );
}
