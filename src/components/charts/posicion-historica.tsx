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
          {/* Colores vía var(--color-*) en vez de hex hardcodeado -así el
              gráfico sigue automáticamente al tema del sitio (ver
              globals.css) en vez de quedar pisado con los valores del tema
              oscuro anterior, que se veían mal (grilla/texto casi
              invisibles, tooltip oscuro) sobre el fondo claro actual. */}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="indice"
            stroke="var(--color-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            padding={{ left: 10, right: 10 }}
            tickFormatter={(indice: number) => {
              // Varios campeonatos del mismo año repetían "2026" en cada
              // punto -solo se rotula el primero de cada año.
              const anio = chartData[indice]?.anio;
              return indice === 0 || anio !== chartData[indice - 1]?.anio ? String(anio ?? '') : '';
            }}
          />
          <YAxis
            reversed
            stroke="var(--color-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[1, 'dataMax']}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              borderRadius: '0.5rem',
              color: 'var(--color-foreground)',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)'
            }}
            itemStyle={{ color: 'var(--color-accent)' }}
            labelStyle={{ color: 'var(--color-muted)', marginBottom: '0.25rem' }}
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
            stroke="var(--color-primary)"
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--color-accent)', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
