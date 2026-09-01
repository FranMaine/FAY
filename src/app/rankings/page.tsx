import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { MedalIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Rankings | FAY Stats",
};

const mockRanking = [
  { pos: 1, nombre: "Juan Pérez", club: "YCA", puntos: 145, campeonatos: 3 },
  { pos: 2, nombre: "María Gómez", club: "CNSI", puntos: 132, campeonatos: 3 },
  { pos: 3, nombre: "Pedro Alonso", club: "CVB", puntos: 110, campeonatos: 2 },
  { pos: 4, nombre: "Lucía Rossi", club: "YCA", puntos: 95, campeonatos: 2 },
  { pos: 5, nombre: "Tomás Blanco", club: "CNMP", puntos: 88, campeonatos: 3 },
];

export default function RankingsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Rankings Generales</h1>
          <p className="text-muted-foreground text-lg">Clasificaciones por clase y temporada (Calculado automáticamente)</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-surface border border-border rounded-lg">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Clase</label>
            <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
              <option>Optimist</option>
              <option>ILCA 6</option>
              <option>ILCA 7</option>
              <option>29er</option>
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Temporada</label>
            <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
              <option>2024</option>
              <option>2023</option>
              <option>Histórico</option>
            </select>
          </div>
        </div>

        <Card className="bg-surface border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium w-16 text-center">Pos</th>
                    <th className="px-6 py-4 font-medium">Regatista</th>
                    <th className="px-6 py-4 font-medium">Club</th>
                    <th className="px-6 py-4 font-medium text-center">Campeonatos</th>
                    <th className="px-6 py-4 font-medium text-right">Puntos Totales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockRanking.map((r, i) => (
                    <tr key={i} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-center">
                        {r.pos === 1 ? <MedalIcon className="w-6 h-6 text-yellow-500 mx-auto" /> : 
                         r.pos === 2 ? <MedalIcon className="w-6 h-6 text-gray-400 mx-auto" /> : 
                         r.pos === 3 ? <MedalIcon className="w-6 h-6 text-amber-700 mx-auto" /> : 
                         <span className="text-muted-foreground">{r.pos}</span>}
                      </td>
                      <td className="px-6 py-4 font-medium text-lg">{r.nombre}</td>
                      <td className="px-6 py-4 text-muted-foreground">{r.club}</td>
                      <td className="px-6 py-4 text-center">{r.campeonatos}</td>
                      <td className="px-6 py-4 text-right font-bold text-primary text-lg">{r.puntos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
