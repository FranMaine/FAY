'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export interface PosicionHistoricaData {
  campeonato: string;
  posicion: number;
  anio: number;
}

interface PosicionHistoricaProps {
  data: PosicionHistoricaData[];
}

export function PosicionHistorica({ data }: PosicionHistoricaProps) {
  // El eje X no puede usar "anio" como dataKey: si dos campeonatos del
  // historial son del mismo año (algo común, ej. Metropolitano y SIY),
  // Recharts los trata como el mismo valor de categoría y el tooltip
  // termina mostrando el campeonato equivocado al pararse sobre el punto
  // -siempre el primero con ese año, no el que está debajo del cursor. Le
  // damos a cada punto una clave de posición única (su índice) y mostramos
  // el año solo como etiqueta del tick / del tooltip.
  const chartData = data.map((d, indice) => ({ ...d, indice }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="indice"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            padding={{ left: 10, right: 10 }}
            tickFormatter={(indice: number) => String(chartData[indice]?.anio ?? '')}
          />
          <YAxis
            reversed
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[1, 'dataMax']}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              borderColor: '#334155',
              borderRadius: '0.5rem',
              color: '#f8fafc'
            }}
            itemStyle={{ color: '#fbbf24' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '0.25rem' }}
            formatter={(value) => [`Posición ${value}`, 'Posición']}
            labelFormatter={(_label, payload) => {
              if (payload && payload.length > 0) {
                const punto = payload[0].payload as PosicionHistoricaData;
                return `${punto.campeonato} (${punto.anio})`;
              }
              return '';
            }}
          />
          <Line
            type="monotone"
            dataKey="posicion"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4, fill: '#fbbf24', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#fbbf24', stroke: '#1e293b', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
