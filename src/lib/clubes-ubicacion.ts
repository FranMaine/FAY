// Ubicación aproximada de cada club (por la sigla guardada en Club.nombre, en
// mayúsculas) para el mapa de /viento. Salen de OpenStreetMap; sirven para
// ubicar el club en el mapa, no para navegar hasta la puerta. Los clubes que
// no están acá (los del exterior, los que no se pudieron ubicar con seguridad)
// simplemente no aparecen en el mapa: se suman cuando se confirma dónde están.
export const UBICACION_CLUBES: Readonly<Record<string, readonly [latitud: number, longitud: number]>> = {
  YCA: [-34.59589, -58.36241], // Dársena Norte (Puerto Madero)
  CNO: [-34.50514, -58.47542],
  CUBA: [-34.53814, -58.44983], // sede náutica de Núñez
  CNSI: [-34.43974, -58.52708],
  CVB: [-34.44459, -58.52905],
  YCR: [-32.90047, -60.68128],
  CNMP: [-38.04078, -57.54141],
  YCO: [-34.50404, -58.4782],
  CRLP: [-34.84057, -57.91894],
  CNP: [-31.71284, -60.50511],
  CVSI: [-34.4547, -58.50528],
  CNAS: [-34.44776, -58.5213],
  RRC: [-32.894, -60.68456],
  CNSP: [-33.67335, -59.65549],
  CVR: [-32.90382, -60.68038],
  CNSE: [-34.44822, -58.51663],
  YCPE: [-34.96428, -54.95001],
  CNZ: [-34.09145, -59.02164],
  CRSN: [-33.32686, -60.21449],
  CAVLA: [-40.76776, -71.64662],
  YCU: [-34.78639, -56.35032],
  CNSM: [-34.4457, -58.52742],
  CRR: [-32.90789, -60.67653],
  CNV: [-34.44658, -58.52517],
  CNQ: [-34.70471, -58.2325],
  YCSF: [-31.6422, -60.68007],
};
