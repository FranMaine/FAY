"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SearchIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VincularPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  // Mock results
  const mockResults = [
    { id: "1", nombre: "Juan Pérez", club: "YCA", clase: "Optimist" },
    { id: "2", nombre: "Juan Manuel Pérez", club: "CNSI", clase: "ILCA 6" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 800);
  };

  const handleLink = () => {
    if (confirm("¿Estás seguro de que este es tu perfil?")) {
      console.log("Linking to profile:", selectedProfile);
      router.push("/mi-perfil");
    }
  };

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
                className="pl-10 h-12 text-lg bg-background border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-8" disabled={isSearching || !searchTerm.trim()}>
              {isSearching ? "Buscando..." : "Buscar"}
            </Button>
          </form>

          {searchTerm && !isSearching && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Resultados de búsqueda</h3>
              <div className="grid gap-3">
                {mockResults.map((result) => (
                  <div 
                    key={result.id}
                    onClick={() => setSelectedProfile(result.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedProfile === result.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border bg-background hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-border">
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{result.nombre}</p>
                        <p className="text-sm text-muted-foreground">{result.club} • {result.clase}</p>
                      </div>
                    </div>
                    <div className="flex items-center h-full">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
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
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button variant="ghost" onClick={() => router.push("/mi-perfil")} className="text-muted-foreground hover:text-foreground hover:bg-surface">Cancelar</Button>
          <Button onClick={handleLink} disabled={!selectedProfile}>Vincular cuenta</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
