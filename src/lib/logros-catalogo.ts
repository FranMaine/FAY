// Catálogo y tipos del sistema de medallas, separados de logros.ts a
// propósito: ese archivo importa prisma (server-only, arrastra "pg") y
// LogrosSection (componente cliente, para el modal de detalle al tocar una
// medalla) necesita el catálogo sin arrastrar nada de eso al bundle del
// navegador. Si algo de acá vuelve a depender de prisma, se rompe el build
// del cliente otra vez.

export interface LogroDef {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string; // nombre de archivo en /public/logros
}

export const LOGROS: LogroDef[] = [
  { id: "debut", nombre: "Debut", descripcion: "Primera regata disputada", icono: "debut.png" },
  { id: "primeros-puntos", nombre: "Primeros puntos", descripcion: "Primera vez entre los 10 primeros", icono: "primeros-puntos.png" },
  { id: "primer-podio", nombre: "Primer podio", descripcion: "Primera vez en el 1°, 2° o 3° puesto", icono: "primer-podio.png" },
  { id: "primera-victoria", nombre: "Primera victoria", descripcion: "Primer 1° puesto", icono: "primera-victoria.png" },
  { id: "campeon-clase", nombre: "Campeón de clase", descripcion: "1° en el ranking anual de una clase", icono: "campeon-clase.png" },
  { id: "mejora-constante", nombre: "Mejora constante", descripcion: "Mejoró su posición en 3 campeonatos seguidos", icono: "mejor-puntaje.png" },
  { id: "racha-podios", nombre: "Racha de podios", descripcion: "Podio en 3 o más regatas seguidas de un mismo campeonato", icono: "racha-podios.png" },
  { id: "remontada", nombre: "Remontada", descripcion: "Arrancó fuera del top 10 y terminó en podio", icono: "remontada.png" },
  { id: "doblete-triplete", nombre: "Doblete/Triplete", descripcion: "Ganó el mismo campeonato 2 o más años distintos", icono: "doblete-triplete.png" },
  { id: "veterano", nombre: "Veterano", descripcion: "50 regatas disputadas", icono: "veterano.png" },
  { id: "trayectoria-larga", nombre: "Trayectoria larga", descripcion: "Compitió en 5 o más temporadas distintas", icono: "trayectoria-larga.png" },
  { id: "regular", nombre: "Regular", descripcion: "3 o más campeonatos en un mismo año", icono: "regular.png" },
  { id: "sin-descartes", nombre: "Sin descartes feos", descripcion: "Nunca descartó un resultado fuera del top 10", icono: "sin-descartes.png" },
  { id: "multiclase", nombre: "Multiclase", descripcion: "Compitió en 3 o más clases distintas", icono: "multiclase.png" },
  { id: "podio-multiclase", nombre: "Podio multiclase", descripcion: "Hizo podio en 2 o más clases distintas", icono: "podio-multiclase.png" },
  { id: "dos-colores", nombre: "Dos colores", descripcion: "Compitió representando 2 o más clubes", icono: "dos-colores.png" },
  { id: "primer-podio-club", nombre: "Primer podio del club", descripcion: "Primer regatista de su club en pisar un podio", icono: "primer-podio-club.png" },
  { id: "primer-campeon-club", nombre: "Primer campeón del club", descripcion: "Primer 1° puesto para su club", icono: "primer-campeon-club.png" },
  { id: "margen-amplio", nombre: "Margen amplio", descripcion: "Ganó un campeonato por una diferencia de puntos grande", icono: "margen-amplio.png" },
  { id: "capitan-timon", nombre: "Capitán del timón", descripcion: "100 regatas disputadas", icono: "capitan-timon.png" },
  { id: "imbatible", nombre: "Imbatible", descripcion: "Ganó todas las regatas de un campeonato", icono: "imbatible.png" },
];

export interface LogroResultadoRegata {
  regataNumero: number;
  puesto: number;
  descartado: boolean;
}

export interface LogroHistorialEntry {
  campeonatoId: string;
  campeonatoNombre: string;
  evento: string | null;
  claseId: string;
  anio: number;
  fecha: Date;
  posicion: number;
  totalInscriptos: number;
  // Solo presente cuando ganó (posicion === 1): diferencia de puntos netos
  // respecto al 2° puesto -null si no ganó o si no se pudo calcular.
  diferenciaSegundo: number | null;
  resultados: LogroResultadoRegata[];
}

export interface LogroRegatistaInfo {
  id: string;
  clubId: string | null;
  otrosClubesIds: string[];
}

export interface LogroDesbloqueado {
  id: string;
  detalle: string;
}
