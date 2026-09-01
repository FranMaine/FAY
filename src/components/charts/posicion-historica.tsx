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
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="anio" 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            padding={{ left: 10, right: 10 }}
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
            formatter={(value: any) => [`Posición ${value}`, 'Posición']}
            labelFormatter={(label, payload) => {
              if (payload && payload.length > 0) {
                return `${payload[0].payload.campeonato} (${label})`;
              }
              return label;
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
