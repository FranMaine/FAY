"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SearchIcon, UserIcon, Loader2Icon, AlertCircleIcon, ClockIcon } from "lucide-react";
import { mensajeDeError } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface ResultadoBusqueda {
  id: string;
  nombre: string;
  pais: string | null;
  club: { nombre: string } | null;
}

interface Solicitud {
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  regatista: { nombre: string };
}

export default function VincularPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ResultadoBusqueda[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Reemplaza al confirm() nativo del navegador (ver Modal, mismo
  // componente que ya usan los modales de admin) -antes de esto, la
  // confirmación era el diálogo feo del propio browser en vez de algo con
  // la estética del sitio.
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/vincular');
        const data = await res.json();
        setSolicitud(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingStatus(false);
      }
    }
    if (session) {
      checkStatus();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingStatus(false);
    }
  }, [session]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSelectedProfile(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = () => {
    if (!selectedProfile) return;

    if (!session) {
      router.push("/login");
      return;
    }

    setError(null);
    setMostrarConfirmacion(true);
  };

  const confirmarVinculacion = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regatistaId: selectedProfile })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo enviar la solicitud.");
        setMostrarConfirmacion(false);
      } else {
        router.push("/mi-perfil");
      }
    } catch (e) {
      setError(mensajeDeError(e));
      setMostrarConfirmacion(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const perfilSeleccionado = results.find((r) => r.id === selectedProfile);

  if (isLoadingStatus) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  // Si ya tiene una solicitud pendiente o aprobada
  if (solicitud && (solicitud.estado === 'PENDIENTE' || solicitud.estado === 'APROBADA')) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-10 flex items-start justify-center">
        <Card className="w-full max-w-lg bg-surface border-border mt-10 text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              {solicitud.estado === 'PENDIENTE' ? <ClockIcon className="w-8 h-8" /> : <UserIcon className="w-8 h-8" />}
            </div>
            <CardTitle className="text-2xl">Perfil Reclamado</CardTitle>
            <CardDescription className="text-base mt-2">
              {solicitud.estado === 'PENDIENTE' 
                ? `Tu solicitud para vincularte a la cuenta de "${solicitud.regatista.nombre}" está siendo revisada por un administrador.`
                : `Ya tienes tu cuenta vinculada a "${solicitud.regatista.nombre}".`}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center pt-4">
            <Button onClick={() => router.push('/mi-perfil')}>
              Ir a mi panel
            </Button>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10 flex items-start justify-center">
      <Card className="w-full max-w-2xl bg-surface border-border mt-10">
        <CardHeader>
          <CardTitle className="text-3xl">Vincular Perfil</CardTitle>
          <CardDescription className="text-base">
            Buscá tu nombre en la base de datos de regatistas para conectar tu historial de resultados con tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Nombre, apellido o número de vela..." 
                className="pl-10 h-12 text-lg bg-background border-border focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-8" disabled={isSearching || !searchTerm.trim()}>
              {isSearching ? <Loader2Icon className="w-5 h-5 animate-spin" /> : "Buscar"}
            </Button>
          </form>

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Resultados de búsqueda</h3>
              <div className="grid gap-3">
                {results.map((result) => (
                  <div 
                    key={result.id}
                    onClick={() => setSelectedProfile(result.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedProfile === result.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-background hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-border">
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{result.nombre}</p>
                        <p className="text-sm text-muted-foreground">{result.club?.nombre || 'Sin club'} {result.pais ? `• ${result.pais}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center h-full">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedProfile === result.id ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                      }`}>
                        {selectedProfile === result.id && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && searchTerm && !isSearching && (
            <div className="flex items-center justify-center p-6 border-2 border-dashed border-border rounded-xl text-muted-foreground">
              <AlertCircleIcon className="w-5 h-5 mr-2" />
              No se encontraron regatistas con ese nombre.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-500 text-sm">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button variant="ghost" onClick={() => router.push("/mi-perfil")} className="text-muted-foreground hover:text-foreground hover:bg-surface">Cancelar</Button>
          <Button onClick={handleLink} disabled={!selectedProfile || isSubmitting}>
            {isSubmitting ? <Loader2Icon className="w-5 h-5 animate-spin mr-2" /> : null}
            Solicitar Vinculación
          </Button>
        </CardFooter>
      </Card>

      <Modal
        isOpen={mostrarConfirmacion}
        onClose={() => !isSubmitting && setMostrarConfirmacion(false)}
        className="w-full max-w-md"
      >
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold">Confirmar vinculación</h2>
            <p className="text-muted-foreground mt-2">
              ¿Confirmás que <strong className="text-foreground">{perfilSeleccionado?.nombre}</strong> es tu perfil
              oficial? La solicitud va a ser revisada por un administrador antes de vincularse a tu cuenta.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setMostrarConfirmacion(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={confirmarVinculacion} disabled={isSubmitting}>
              {isSubmitting ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
