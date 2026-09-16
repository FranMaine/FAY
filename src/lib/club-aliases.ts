/**
 * Nombre completo conocido para clubes cuyo campo `nombre` en la base es
 * una sigla (ej: "CNSI") -pensado para que la búsqueda encuentre el club
 * aunque alguien escriba "náutico san isidro" en vez de la sigla, y para
 * mostrarlo como subtítulo en la ficha del club.
 *
 * Se completó a mano durante la limpieza de datos de clubes (ver
 * fusionarClubes en src/lib/club-merge.ts): la mayoría de estos nombres
 * completos estaban cargados en la base como un club APARTE ("CNSI - Club
 * Náutico San Isidro"), duplicando al mismo club real -se fusionaron en
 * uno solo, y este mapa conserva el nombre completo que traían para no
 * perderlo del todo.
 *
 * Deliberadamente NO incluye:
 *  - Siglas con nombre completo truncado en la fuente original (ej:
 *    "CGLNM", "CDCPV") -mejor no completar a mano lo que se cortó, para no
 *    inventar el final de la frase.
 *  - "CNP": la única sigla que en la base aparecía con DOS nombres
 *    completos distintos ("Club Náutico Paraná" y "Cofradía Náutica del
 *    Pacífico") -no se puede saber cuál de los dos corresponde al club
 *    "CNP" real sin más información, así que se dejó sin fusionar y sin
 *    alias acá (ver el resumen de casos inciertos).
 */
export const CLUB_ALIASES: Record<string, string> = {
  YCR: 'Yacht Club Rosario',
  YCA: 'Yacht Club Argentino',
  CNSI: 'Club Náutico San Isidro',
  CNMP: 'Club Náutico Mar del Plata',
  CUBA: 'Club Universitario de Buenos Aires',
  YCO: 'Yacht Club Olivos',
  CVB: 'Club de Velas Barlovento',
  CRSN: 'Club de Regatas San Nicolás',
  CAVLA: 'Club de Vela Villa La Angostura',
  CVR: 'Club de Velas Rosario',
  CRLP: 'Club de Regatas La Plata',
  RRC: 'Rosario Rowing Club',
  CNA: 'Club Náutico Albatros',
  CNSP: 'Club Náutico San Pedro',
  CNO: 'Club Náutico Olivos',
  YCCN: 'Yacht Club Centro Naval',
  CNJ: 'Club Náutico Junín',
  CNZ: 'Club Náutico Zárate',
  CPNLB: 'Club de Pesca y Náutica Las Barrancas',
  CNSE: 'Club Náutico Sudeste',
  CNSA: 'Club Náutico Sportivo Avellaneda',
  CVSI: 'Club de Veleros San Isidro',
  CNSM: 'Club Náutico San Martín',
  CNV: 'Club Náutico Victoria',
  CRR: 'Club de Regatas Rosario',
  YCC: 'Yacht Club Corrientes',
  '400YCC': 'Yacht Club Córdoba',
};
