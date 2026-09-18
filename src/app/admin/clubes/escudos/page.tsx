"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, ArrowLeftIcon, CheckIcon, ExternalLinkIcon, Loader2Icon, PencilIcon, UploadIcon, XIcon } from "lucide-react";
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
  nombreCompleto: string | null;
  regatistasCount: number;
}

function FilaClub({ club, onUpdated, onCambio, onEliminado }: { club: ClubItem; onUpdated: (id: string, logoUrl: string | null) => void; onCambio: (id: string, datos: { nombre: string; nombreCompleto: string | null }) => void; onEliminado: (id: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(club.nombre);
  const [completo, setCompleto] = useState(club.nombreCompleto || "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clubes/${club.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, nombreCompleto: completo.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      onCambio(club.id, { nombre: data.nombre, nombreCompleto: data.nombreCompleto });
      setEditando(false);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/clubes/${club.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar");
      onEliminado(club.id);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

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
        {editando ? (
          <div className="space-y-2">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Abreviación (ej: YCA)" className="w-full text-sm bg-background border border-border rounded-md px-3 py-1.5" />
            <input value={completo} onChange={(e) => setCompleto(e.target.value)} placeholder="Nombre completo" className="w-full text-sm bg-background border border-border rounded-md px-3 py-1.5" />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={guardando} onClick={guardar} className="gap-1">
                {guardando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />} Guardar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setEditando(false); setNombre(club.nombre); setCompleto(club.nombreCompleto || ""); }} className="gap-1">
                <XIcon className="w-4 h-4" /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-medium text-foreground truncate">{club.nombre}</p>
            {club.nombreCompleto && <p className="text-xs text-muted-foreground truncate">{club.nombreCompleto}</p>}
          </>
        )}
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
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar nombre" onClick={() => setEditando(true)}>
          <PencilIcon className="w-4 h-4" />
        </Button>
        <ConfirmDeleteButton onConfirm={eliminar} label="Eliminar club" confirmLabel="¿Eliminar club?" />
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

  function actualizarDatos(id: string, datos: { nombre: string; nombreCompleto: string | null }) {
    setClubes((prev) => prev.map((c) => (c.id === id ? { ...c, ...datos } : c)));
  }

  function quitarDeLista(id: string) {
    setClubes((prev) => prev.filter((c) => c.id !== id));
  }

  const filtrados = clubes.filter((c) => `${c.nombre} ${c.nombreCompleto || ""}`.toLowerCase().includes(busqueda.trim().toLowerCase()));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/admin/clubes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors -ml-1">
            <ArrowLeftIcon className="w-4 h-4" /> Volver
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-3">Listado de clubes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Editá la abreviación y el nombre completo, subí el escudo (&quot;Buscar&quot; abre Google Imágenes) o eliminá un club. Al eliminarlo, sus regatistas quedan sin club.
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
                  <FilaClub key={`${club.id}-${club.nombre}-${club.nombreCompleto}`} club={club} onUpdated={actualizarLogo} onCambio={actualizarDatos} onEliminado={quitarDeLista} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
