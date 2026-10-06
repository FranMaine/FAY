// Códigos WMO que devuelve Open-Meteo, agrupados en pocas categorías visuales.
export type CategoriaClima = 'despejado' | 'nublado' | 'niebla' | 'llovizna' | 'lluvia' | 'nieve' | 'tormenta';

export function categoriaClima(codigo: number): CategoriaClima {
  if (codigo === 0 || codigo === 1) return 'despejado';
  if (codigo === 2 || codigo === 3) return 'nublado';
  if (codigo === 45 || codigo === 48) return 'niebla';
  if (codigo >= 51 && codigo <= 57) return 'llovizna';
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return 'lluvia';
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return 'nieve';
  if (codigo >= 95) return 'tormenta';
  return 'nublado';
}

export const ETIQUETA_CLIMA: Record<CategoriaClima, string> = {
  despejado: 'Despejado',
  nublado: 'Nublado',
  niebla: 'Niebla',
  llovizna: 'Llovizna',
  lluvia: 'Lluvia',
  nieve: 'Nieve',
  tormenta: 'Tormenta',
};

const PUNTOS_CARDINALES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];

export function direccionViento(grados: number): string {
  const indice = Math.round((((grados % 360) + 360) % 360) / 22.5) % 16;
  return PUNTOS_CARDINALES[indice];
}
