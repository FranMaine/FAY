"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClubAvatar } from "@/components/icons/club-avatar";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { mensajeDeError } from "@/lib/utils";

interface ClubItem {
  id: string;
  nombre: string;
  logoUrl: string | null;
  regatistasCount: number;
}

function FilaClub({ club, onUpdated }: { club: ClubItem; onUpdated: (id: string, logoUrl: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(file: File) {
    setSubiendo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/clubes/${club.id}/logo`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir el escudo");
      onUpdated(club.id, data.logoUrl);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/clubes/${club.id}/logo`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo quitar el escudo");
      onUpdated(club.id, null);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 border-b border-border last:border-0">
      <ClubAvatar nombre={club.nombre} logoUrl={club.logoUrl} className="w-12 h-12 text-sm shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{club.nombre}</p>
        <p className="text-xs text-muted-foreground">{club.regatistasCount} regatista{club.regatistasCount === 1 ? "" : "s"}</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent("escudo club náutico " + club.nombre)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          Buscar <ExternalLinkIcon className="w-3 h-3" />
        </a>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) subir(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={subiendo} onClick={() => inputRef.current?.click()} className="gap-2">
          {subiendo ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
          {club.logoUrl ? "Reemplazar" : "Subir"}
        </Button>
        {club.logoUrl && <ConfirmDeleteButton onConfirm={quitar} label="Quitar escudo" />}
      </div>
    </div>
  );
}

export default function AdminEscudosClubesPage() {
  const [clubes, setClubes] = useState<ClubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/admin/clubes")
      .then((res) => res.json())
      .then((data) => setClubes(data))
      .catch((err) => setError(mensajeDeError(err)))
      .finally(() => setIsLoading(false));
  }, []);

  function actualizarLogo(id: string, logoUrl: string | null) {
    setClubes((prev) => prev.map((c) => (c.id === id ? { ...c, logoUrl } : c)));
  }

  const filtrados = clubes.filter((c) => c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/admin/clubes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors -ml-1">
            <ArrowLeftIcon className="w-4 h-4" /> Volver
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-3">Escudos de clubes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Subí el escudo real de cada club -el buscador de al lado abre Google Imágenes ya con el nombre cargado. Se recorta a un cuadrado de forma automática.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/50 text-red-500 text-sm flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar club por nombre..."
          className="bg-surface border-border max-w-sm"
        />

        <Card className="bg-surface border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{filtrados.length} club{filtrados.length === 1 ? "" : "es"}</CardTitle>
            <CardDescription>De un total de {clubes.length}, {clubes.filter((c) => c.logoUrl).length} ya tienen escudo cargado.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div>
                {filtrados.map((club) => (
                  <FilaClub key={club.id} club={club} onUpdated={actualizarLogo} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
