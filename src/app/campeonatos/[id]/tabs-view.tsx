"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResultadosTable } from "@/components/tables/resultados-table";

const mockResultados = [
  { id: "1", posicion: 1, nombre: "Juan Pérez", club: "YCA", totalNeto: 8, puntajes: [
    { regata: 1, puntos: 1, descartado: false },
    { regata: 2, puntos: 2, descartado: false },
    { regata: 3, puntos: 5, descartado: false },
    { regata: 4, puntos: 46, descartado: true, observacion: "UFD" },
    { regata: 5, puntos: 1, descartado: false },
  ] },
  { id: "2", posicion: 2, nombre: "María Gómez", club: "CNSI", totalNeto: 12, puntajes: [
    { regata: 1, puntos: 3, descartado: false },
    { regata: 2, puntos: 4, descartado: false },
    { regata: 3, puntos: 1, descartado: false },
    { regata: 4, puntos: 4, descartado: false },
    { regata: 5, puntos: 12, descartado: true },
  ] },
  { id: "3", posicion: 3, nombre: "Pedro Alonso", club: "CVB", totalNeto: 15, puntajes: [
    { regata: 1, puntos: 2, descartado: false },
    { regata: 2, puntos: 46, descartado: true, observacion: "DNC" },
    { regata: 3, puntos: 3, descartado: false },
    { regata: 4, puntos: 2, descartado: false },
    { regata: 5, puntos: 8, descartado: false },
  ] },
  { id: "4", posicion: 4, nombre: "Lucía Rossi", club: "YCA", totalNeto: 18, puntajes: [
    { regata: 1, puntos: 5, descartado: false },
    { regata: 2, puntos: 1, descartado: false },
    { regata: 3, puntos: 4, descartado: false },
    { regata: 4, puntos: 8, descartado: false },
    { regata: 5, puntos: 46, descartado: true, observacion: "BFD" },
  ] },
  { id: "5", posicion: 5, nombre: "Tomás Blanco", club: "CNMP", totalNeto: 20, puntajes: [
    { regata: 1, puntos: 4, descartado: false },
    { regata: 2, puntos: 5, descartado: false },
    { regata: 3, puntos: 6, descartado: false },
    { regata: 4, puntos: 5, descartado: false },
    { regata: 5, puntos: 9, descartado: true },
  ] },
];

export function TabsView() {
  const [activeTab, setActiveTab] = useState<"general" | "regatas">("general");

  return (
    <div className="space-y-6">
      <div className="flex items-center border-b border-border">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === "general" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Clasificación General
          {activeTab === "general" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("regatas")}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === "regatas" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Por Regata
          {activeTab === "regatas" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="pt-2">
        {activeTab === "general" ? (
          <div className="bg-surface rounded-xl border border-border overflow-hidden p-4">
            <h3 className="font-semibold text-lg mb-4">Resultados Generales</h3>
            <ResultadosTable clasificacion={mockResultados} regatas={[1, 2, 3, 4, 5]} />
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden p-4">
            <h3 className="font-semibold text-lg mb-4">Resultados por Regata</h3>
            <p className="text-muted-foreground">Seleccioná una regata para ver los resultados individuales.</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {[1, 2, 3, 4, 5].map(r => (
                <Button key={r} variant="secondary" className="w-24 border-border text-foreground hover:bg-surface">Regata {r}</Button>
              ))}
            </div>
            <div className="mt-8 border border-dashed border-border p-12 text-center rounded-lg text-muted-foreground">
              Vista detallada de la regata próximamente
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
