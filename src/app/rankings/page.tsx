import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MedalIcon, ArrowRightIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { generarClasificacion } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Rankings | FAY Stats",
};

export const revalidate = 60; // Revalidar cada 60 segundos

async function getRankingGeneral() {
  const campeonatos = await prisma.campeonato.findMany({
    where: { estado: 'PUBLICADO' },
    include: {
      regatas: {
        include: {
          resultados: {
            include: {
              regatista: { include: { club: true } }
            }
          }
        }
      }
    }
  });

  const regatistasStats = new Map<string, { id: string, nombre: string, club: string, campeonatos: number, puntosRanking: number }>();

  for (const camp of campeonatos) {
    // Generar clasificación
    const regMap = new Map();
    camp.regatas.forEach(reg => {
      reg.resultados.forEach(res => {
        if (!regMap.has(res.regatista.id)) {
          regMap.set(res.regatista.id, {
            regatistaId: res.regatista.id,
            nombre: res.regatista.nombre,
            club: res.regatista.club?.nombre || 'Sin club',
            resultados: []
          });
        }
        regMap.get(res.regatista.id).resultados.push({
          regataNumero: reg.numero,
          puesto: res.puesto,
          puntos: res.puntos,
          observacion: res.observacion
        });
      });
    });

    const clasificacion = generarClasificacion(Array.from(regMap.values()), camp.descartes);
    const totalInscriptos = clasificacion.length;

    clasificacion.forEach(c => {
      if (!regatistasStats.has(c.regatistaId)) {
        regatistasStats.set(c.regatistaId, {
          id: c.regatistaId,
          nombre: c.nombre,
          club: c.club || 'Sin club',
          campeonatos: 0,
          puntosRanking: 0
        });
      }
      
      const stats = regatistasStats.get(c.regatistaId)!;
      stats.campeonatos += 1;
      
      // Fórmula simple para el ranking: (Total Inscriptos - Posición + 1)
      // Otorga más puntos por ganar en flotas más grandes
      const puntosObtenidos = (totalInscriptos - c.posicionFinal) + 1;
      stats.puntosRanking += puntosObtenidos;
    });
  }

  // Ordenar por puntos (mayor a menor)
  return Array.from(regatistasStats.values()).sort((a, b) => b.puntosRanking - a.puntosRanking);
}

export default async function RankingsPage() {
  const ranking = await getRankingGeneral();

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Rankings Generales</h1>
          <p className="text-muted-foreground text-lg">Clasificaciones calculadas en base a resultados de los campeonatos oficiales de FAY.</p>
        </header>

        {ranking.length === 0 ? (
          <Card className="bg-surface border-border text-center py-12">
            <CardContent>
              <div className="text-muted-foreground">Aún no hay campeonatos suficientes para calcular el ranking.</div>
            </CardContent>
          </Card>
        ) : (
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
                      <th className="px-6 py-4 font-medium text-right">Puntaje FAY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ranking.map((r, i) => {
                      const pos = i + 1;
                      return (
                        <tr key={r.id} className="hover:bg-background/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-center">
                            {pos === 1 ? <MedalIcon className="w-6 h-6 text-yellow-500 mx-auto" /> : 
                             pos === 2 ? <MedalIcon className="w-6 h-6 text-gray-400 mx-auto" /> : 
                             pos === 3 ? <MedalIcon className="w-6 h-6 text-amber-700 mx-auto" /> : 
                             <span className="text-muted-foreground">{pos}</span>}
                          </td>
                          <td className="px-6 py-4 font-medium text-lg">
                            <Link href={`/regatistas/${r.id}`} className="hover:text-primary transition-colors flex items-center gap-2 group">
                              {r.nombre}
                              <ArrowRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{r.club}</td>
                          <td className="px-6 py-4 text-center">{r.campeonatos}</td>
                          <td className="px-6 py-4 text-right font-bold text-primary text-lg">{r.puntosRanking} pts</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
