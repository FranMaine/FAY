import Link from 'next/link';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface Campeonato {
  id: string;
  nombre: string;
  anio: number;
  clase: string;
  sede: string;
  fechaInicio: string;
  estado: 'PUBLICADO' | 'BORRADOR';
  totalRegatistas: number;
}

interface CampeonatoCardProps {
  campeonato: Campeonato;
}

export function CampeonatoCard({ campeonato }: CampeonatoCardProps) {
  return (
    <Link href={`/campeonatos/${campeonato.id}`} className="block h-full">
      <Card className="h-full transition-all duration-200 hover:scale-[1.02] hover:border-primary/50">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <Badge variant="accent" className="font-semibold">
              {campeonato.clase}
            </Badge>
            <Badge variant={campeonato.estado === 'PUBLICADO' ? 'success' : 'muted'} className="text-[10px]">
              {campeonato.estado}
            </Badge>
          </div>
          
          <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-2">
            {campeonato.nombre}
          </h3>
          <p className="text-sm text-primary mb-4 font-mono">{campeonato.anio}</p>
          
          <div className="mt-auto space-y-2 text-sm text-muted">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{campeonato.sede}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{new Date(campeonato.fechaInicio).toLocaleDateString('es-AR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span>{campeonato.totalRegatistas} inscriptos</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
