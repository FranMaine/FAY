// Fusiona de una sola vez los regatistas y clubes duplicados que revisamos a mano
// (18/10/2026): regatistas de confianza ALTA (mismo nombre con otra forma, errores
// de tipeo y apellidos sueltos de J24) y MEDIA, y clubes de confianza ALTA.
//
// USO (siempre probá primero sin --aplicar: solo muestra el plan, no toca nada):
//
//   PowerShell:  $env:DATABASE_URL = "postgresql://..."; pnpm exec tsx scripts/fusionar-duplicados.ts
//                $env:DATABASE_URL = "postgresql://..."; pnpm exec tsx scripts/fusionar-duplicados.ts --aplicar
//   bash:        DATABASE_URL="postgresql://..." pnpm exec tsx scripts/fusionar-duplicados.ts --aplicar
//
// (si tenés un .env o .env.local con DATABASE_URL, no hace falta pasarla.)
//
// OJO: DATABASE_URL tiene que ser la de la base ACTUAL (proyecto Neon FAY-2, desde el
// 21/10/2026). La base vieja (FAY) quedó solo de respaldo y ya no recibe datos: si el
// script corriera contra ella, el sitio no mostraría ningún cambio.
//
// Al terminar con --aplicar, el script le pide al sitio que limpie su caché de rankings
// (POST /api/revalidar). Eso usa REVALIDAR_TOKEN (y opcionalmente SITE_URL), que ya
// están en .env.local; sin el token, los rankings se actualizan solos en hasta 1 hora.
// Opciones:  --solo=alta|tipeo|j24|media|clubes   corre un solo bloque
//
// Reglas de seguridad (un grupo se SALTEA, con el motivo en pantalla, si no las cumple):
//  - Todos los nombres del grupo tienen que existir y ser únicos (si uno ya no existe, o
//    hay dos fichas con el mismo nombre exacto, se saltea ese nombre / el grupo).
//  - Dos fichas del grupo NO pueden tener resultado en la misma regata: eso prueba que
//    son personas distintas (nadie navega dos barcos a la vez) y fusionarlas borraría
//    resultados reales.
// Usa las mismas funciones que el panel de admin (fusionarRegatistas / fusionarClubes):
// los resultados se mueven al registro que se mantiene y el nombre viejo queda como
// alias para que un import futuro no vuelva a crear la ficha.
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

type Nivel = 'alta' | 'tipeo' | 'j24' | 'media';
interface Grupo {
  nivel: Nivel;
  mantener: string | RegExp;
  fusionar: (string | RegExp)[];
}

const g = (nivel: Nivel, mantener: string | RegExp, ...fusionar: (string | RegExp)[]): Grupo => ({ nivel, mantener, fusionar });

const GRUPOS: Grupo[] = [
  // ───────────── ALTA: mismo nombre con otra forma (tilde, orden, apellido de más) ─────────────
  g('alta', 'Sophia Navratil Thompson', 'Sophia Navratil'),
  g('alta', 'Tobias Lopez Pozzo', 'Tobias Pozzo'),
  g('alta', 'Maria Ines Panasci Dubra', 'Ine Panasci Dubra'),
  g('alta', 'Martin Manrique Gasme', 'Martin Manrique'),
  g('alta', 'María Emilia D’Ottavio', "Maria Emilia D'Ottavio", 'Maria Emilia D`ottavio', 'Dottavio Maria Emilia'),
  g('alta', 'Juan Sebastian Properzi', 'Juan Properzi'),
  g('alta', 'Martin Tejada Ibañez', 'TEJADA IBAÑEZ Martín Sebastián'),
  g('alta', 'Valentina Galli Kluge', 'Valentina Galli'),
  g('alta', 'Sofía Belén D’Onofrio Lorenzo', 'Sofia Belen D`Onofrio Lorenzo', "Sofina Belen D'Onofrio Lorenzo", 'Sofia Belen D Onofrio Lorenzo'),
  g('alta', 'Iñaki Fernandez Alonso', 'Iñaki Fernandez'),
  g('alta', 'Ariel Martin Garcia', 'Ariel García'),
  g('alta', 'Santiago Viale Ponzo', 'Santiago Viale', 'VIALE PONZO Santiago Andres'),
  g('alta', 'Guillermo Andres Villar', 'Andres Villar'),
  g('alta', 'Juan Robinson Silva', 'Juan Silva Roinson'),
  g('alta', 'Maggie Maria Pinto', 'Maggie Pinto'),
  g('alta', 'Naina Pinto', 'PINTO Naina Marie'),
  g('alta', 'Tomás Bautista Elías', 'Tomas Elias', 'Tomas B Elías'),
  g('alta', 'Santiago Dono Moya', 'DONO Santiago'),
  g('alta', 'Delfina Eva Gotelli Grasetti', 'GOTELLI Delfina Eva', 'GOTELLI Delfina'),
  g('alta', 'Carolina Zardini Suarez', 'ZARDINI Carolina'),
  g('alta', 'Francesca Zardini Suarez', 'ZARDINI SUAREZ Francesca Oriana', 'FRANCESCA Zardini'),
  g('alta', 'Fernando Zardini Suarez', 'ZARDINI Fernando', 'ZARDINI SUAREZ Fernando Luis'),
  g('alta', 'Franco Bicocca', 'Bicocca Martinez Franco'),
  g('alta', 'Julieta Bicocca', 'Bicocca Martinez Julieta'),
  g('alta', 'Sacha Donofrio Freytes', 'DONOFRIO Sacha'),
  g('alta', 'Ambar Bruno', 'Bruno Ambar Isabella'),
  g('alta', 'Belen Pacheco', 'Pacheco Zapiola Belen', 'Belén María Pacheco Zapiola'),
  g('alta', 'Joaquin Casiel Von Eckenbrecher Gould', 'VON ECKENBRECHER GOULD Joaquin'),
  g('alta', 'Felipe Barral De Mey', 'Barral De Mey Felipe Tomás'),
  g('alta', 'Isabel Hariri', 'Hariri María Isabel'),
  g('alta', 'Axel Goitea', 'Bladimir Goitea Axel'),
  g('alta', 'Francisco Marin Parrella', 'PARRELLA Francisco'),
  g('alta', 'Agustin Azula Zanou', 'Azula Agustin'),
  g('alta', 'Amparo Stupenengo Perfaur', 'Amparo Stupenengo'),
  g('alta', 'Federico Rafael Hormaiztegui', 'Federico Hormaiztegui'),
  g('alta', 'Octavio Dorbessan', 'Octavio Dorbessan Dorbessan'),
  g('alta', 'Pedro Armando Anino', 'ANINO Pedro'),
  g('alta', 'Alejandro Marcelo Rosso', 'ROSSO Alejandro'),
  g('alta', 'Marco Agustín Quijano', 'Marco Quijano'),
  g('alta', 'Gabriel Salinas', 'Gabriel Hernman Salinas'),
  g('alta', 'Andres Marcone', 'MARCONE Andres Benjamin'),
  g('alta', 'ROS MOLINA Milo René', 'ROS MOLINA Milo', 'Milo Ros'),
  g('alta', 'TIMPONE Emilia Tiara', 'TIMPONE Emilia'),
  g('alta', 'RAVIOLA GARCIA Juana', 'RAVIOLA Juana'),
  g('alta', 'CAMPITELLI FUMAGALLO Felipe', 'Campitelli Felipe'),
  g('alta', 'Cordoba Samuel Valentino', 'CORDOBA Samuel'),
  g('alta', 'VANIN Lautaro Tomas', 'Vanin Lautaro'),
  g('alta', 'CHAPARRO LATORRE Francisco Nahuel', 'CHAPARRO LATORRE Francisco'),
  g('alta', 'AGUIRRE GARI Camila Cruz', 'AGUIRRE GARI Camila'),
  g('alta', 'BUGNI MARTINEZ Josefina', 'Bugni Josefina'),
  g('alta', 'ADLERCREUTZ Inés Maria', 'ADLERCREUTZ Inés'),
  g('alta', 'Messina Milo Agustin', 'MESSINA Milo'),
  g('alta', 'LOUREYRO MORGENSTERN Lisandro', 'Lisandro Loureyro'),
  g('alta', 'BIZZOZERO SIMONE Tomás', 'BIZZOZERO Tomas'),
  g('alta', 'LENZETTI COLIN Emma', 'LENZETTI Emma'),
  g('alta', 'PECIÑA GUALDONI Lucia', 'Lucia Peciña'),
  g('alta', 'PANASCI DUBRA Agustin', 'PANASCI Agustin', 'Panasci Dubra Juan Agustin'),
  g('alta', 'PANASCI DUBRA Nacho', 'Nacho Panasci', 'Panasci Dubra Juan Ignacio'),
  g('alta', "Bautista D'OTTAVIO", 'D’OTTAVIO Bautista'),
  g('alta', 'Godoy Renata Carmela', 'GODOY Renata', 'GODOY CORONEL Renata Carmela'),
  g('alta', 'MONES RUIZ Rafael', 'MONES Rafael'),
  g('alta', 'DE BERNARDIS Gael Martín', 'DE BERNARDIS Gael'),
  g('alta', 'HIDALGO Iván Agustín', 'Ivan Hidalgo'),
  g('alta', 'COCOZZA Julia', 'Cocozza Juli'),
  g('alta', 'Tizziano Valentino Bieler', 'BIELER Tizziano'),
  g('alta', 'MORENO PEDROSO Simona', 'MORENO Simona'),
  g('alta', 'PERICAZ ESTEVEZ Benjamin', 'PERICAZ Benjamin'),
  g('alta', 'Carlota Moreno Cantillana', 'MORENO Carlota'),
  g('alta', 'Matilde Pini Bellaubi', 'PINI Matilde'),
  g('alta', 'Martin Lucero schmidt', 'LUCERO Martín'),
  g('alta', 'LEON Domingo', 'Domingo LEON LEON'),
  g('alta', 'José Tomás CATTARINICH SERON', 'CATTARINICH Jose Tomas'),
  g('alta', 'Marcos SILVA ROBINSON', 'Marcos Silva'),
  g('alta', 'SILVA ROBINSON Catalina', 'Catalina Silva'),
  g('alta', 'BURDE Hernan', 'Hernan Jose BURDE'),
  g('alta', 'Gaspar Leo Toro', 'Gaspar Toro'),
  g('alta', 'Romaldini Madera Luca', 'Luca Romaldini'),
  g('alta', 'Marquez Luis Matias', 'Luis Marquez'),
  g('alta', 'Martin Segundo Curutchet', 'CURUTCHET Segundo'),
  g('alta', 'Martin Alonso', 'Martin Pablo Alonso'),
  g('alta', 'Tomas Santiago Eastman', 'EASTMAN Tomas'),
  g('alta', 'PANTANALI GARCIA Felipe', 'PANTANALI Felipe'),
  g('alta', 'Vergallo Delfina', 'VERGALLO Defina'),
  g('alta', 'AGUIRRE Valentina B.', 'Aguirre Valentina'),
  g('alta', 'Santorsola Matías Nicolás', 'SANTÓRSOLA Matias'),
  g('alta', 'Santorsola Alejandro Nicolás', 'SANTÓRSOLA Alejandro'),
  g('alta', 'STOCIK Josefina L.', 'STOCIK Josefina'),
  g('alta', 'BALDI Franco', 'BALDI Franci'),
  g('alta', 'CHASMANN ESPOSITO Lorenzo', 'CHASMANN Lorenzo'),
  g('alta', 'CLAISSE Felipe Horacio', 'CLAISSE Felipe'),
  g('alta', 'DE BAGGE Lautaro Julián', 'DE BAGGE Lautaro'),
  g('alta', 'DEHO CASTAGNOLA Ignacio', 'Ignacio Deho'),
  g('alta', 'DEHO CASTAGNOLA Thomas', 'Thomas Dehó'),
  g('alta', 'Jose Arigos', 'ARIGOS José Manuel'),
  g('alta', 'Juan Francisco Begino Morero', 'BEGINO MORENO Juan Francisco'),
  g('alta', 'SANTOS Federico Ignacio', 'Santos Federico'),
  g('alta', 'ALDATZ Julieta', 'Aldatz Julieta Amaia'),
  g('alta', 'Paulo M Cosentino', 'Paulo Cosentino'),
  g('alta', 'Sergio Péndola', 'Sergio Esteban Pendola'),
  g('alta', 'Roque Francisco Bevilacqua', 'Roque Bevilacqua'),
  g('alta', 'Juan Ignacio Sorocinschi', 'Juan Ignacio Sorocinshi'),

  // ───────────── TIPEO: mismo nombre con un error de tipeo ─────────────
  g('tipeo', 'Manuel Cichowolski Iribas', 'Manuel Chichowolski Iribas'),
  g('tipeo', 'BRUGO Benjamín Andrés', 'Benjamin Andres Brigo'),
  g('tipeo', 'Grecia Lenzetti', 'Grecia Lanzetti'),
  g('tipeo', 'Cristian Granados', 'Granados Critian'),
  g('tipeo', 'Ivan Spoliansky Keten', 'Ivan Spoliansky Katen'),
  g('tipeo', 'Benjamin Cingolani', 'CINGOLANI Banjamin'),
  g('tipeo', 'MICELE Candelaria', 'MICELE Candearia'),
  g('tipeo', 'NIEVA QUINTEROS Santiago', 'NIEVA QUINTROS Santiago'),
  g('tipeo', 'PARRINO Dante', 'PARRINO Danre'),
  g('tipeo', 'Gino Muscolini', 'Ginio Muscolini'),
  g('tipeo', 'Franco Vázquez Fontana', 'VASQUEZ FONTANA Franco'),
  g('tipeo', 'Francisco Van Avermaete', 'Franciso Van Avermaete'),
  g('tipeo', 'Tania López Obejero', 'Tania López Ovejero', 'Tania Obejero'),
  g('tipeo', 'Juan Cruz Perrotta', 'Juan Cruz Perrota'),
  g('tipeo', 'BARRERA Joscelyn', 'Barrera Joselyn'),
  g('tipeo', 'Silvina Otado', 'Silvina Otada'),
  g('tipeo', 'Gustavo Iconomopulos', 'Gustavo Iconompulos'),
  g('tipeo', 'Hofer Ignacio', 'HOFFER Ignacio'),
  g('tipeo', 'Marco Augusto Bertone', 'Marco Bertone', 'Marco Nertone'),
  g('tipeo', 'Mariano Cambon', 'Mariano Claude Cambon', 'Mariano Combon'),
  g('tipeo', 'Fernando Oso D´emilio', 'Fernando Demilio', 'OSO Fernando'),
  g('tipeo', 'Juan Martín Locatelli', 'Juan Locatelli', 'Juan M Locatelli'),
  g('tipeo', 'Erich Mones Ruiz', 'MONES Erich'),
  g('tipeo', 'MONES RUIZ Hernán', 'Hernan Monez Ruiz'),
  g('tipeo', 'Tomas Fioritti', 'FIORITI Tomás'),
  g('tipeo', 'Paolo Farruko Perrino', 'Paolo Farruko', 'Paolo Farruko Perino'),
  g('tipeo', 'Martín Pedro Ferrero', 'Martin Ferrero', 'FERRERO Martín P.'),
  g('tipeo', 'NIEVA ORELLANA Romeo', 'Romeo Nieva', 'NIEVA ORELLAN Romeo', 'NIEVA ORELLANA Romeo David'),
  // el nombre viene con un carácter roto ("A•lvaro"): se busca con un patrón
  g('tipeo', 'GÓMEZ Álvaro Valentín', /^A.{1,3}lvaro Valentin Gamez$/),
  g('tipeo', 'Guido Agustin Lepori', 'Guido Lepori'),
  g('tipeo', 'Franco Díaz', 'Franco Diaz Tamallo'),

  // ───────────── J24: apellido suelto = tripulante de J24 ya cargado ─────────────
  g('j24', 'Javier Moyano', 'Moyano'),
  g('j24', 'Ramiro Camilotto', 'Camilotto'),
  g('j24', 'Beatriz Agusti', 'Agusti'),
  g('j24', 'Gustavo Saul', 'Saúl'),
  g('j24', 'Nicolas Cubria', 'Cubría'),
  g('j24', 'Lucila Benavides', 'Benavides'),
  g('j24', 'Angeles Damico', 'Damico'),
  g('j24', 'Martin Mosca', 'Mosca'),

  // ───────────── MEDIA: probables (el chequeo de "misma regata" los protege) ─────────────
  g('media', 'Brandon Herrera Barrera', 'Brandon Barrera'),
  g('media', 'RONCHI Nicolas Augusto', 'Nicolas Ronchi'),
  g('media', 'Lucia Manrique Gasme', 'Lucia Manrique'),
  g('media', 'Martin Manrique Gasme', 'Martin Manrrique'),
  g('media', 'PINTO Pedro Paulo', 'Pedro Pinto'),
  g('media', 'Agustin Palacio Canto', 'PALACIO Agustín'),
  g('media', 'Juan Ignacio Cernadas', 'Juany Cernadas'),
  g('media', 'Juan Ignacio Grimaldi', 'Juan Grimaldi', 'Grimaldi Juani'),
  g('media', 'Cecilia Gwozdz', 'Gwodz Cecilia'),
  g('media', 'Mariano Nazarov', 'Mariano Nasarov'),
  g('media', 'Maite Irigoitia', 'Maite Irigoytia'),
  g('media', 'Azul Maciel Francisconi', 'Azul Maciel Franciconi'),
  g('media', 'Martin Arroyo Verdi', 'Martin Arroyo'),
  g('media', 'Pablo Sebastian Piñeyro', 'Pablo Piñeyro'),
  g('media', 'FREGONESE Juan Pablo', 'Juan Fregonese'),
  g('media', 'Esteban Alonso', 'AFONSO Esteban'),
  g('media', 'Nicolas Garcia', 'Nicolas Barcia'),
];

// Clubes de confianza alta: [club que se mantiene, clubes a fusionar dentro de él].
const CLUBES: [string, string[]][] = [
  ['CPNLB', ['BARRANCAS']],
  ['CNAS', ['CLUB NÁUTICO ALBATROS']],
  ['CNBB', ['CLUB NÁUTICO BAHÍA BLANCA']],
  ['CNBDO', ['CLUB NÁUTICO BUCHARDO']],
  ['CDCPV', ['CDCPV CHILE']],
  ['AGUILA', ['EL AGUILA', 'PTO. DEL AGUILA']],
  ['CRL', ['CLUB REGATAS LIMA']],
  ['ICB', ['IATE CLUBE DE BRASÍLIA']],
  ['YCC', ['400YCC']],
];

const APLICAR = process.argv.includes('--aplicar');
const SOLO = process.argv.find((a) => a.startsWith('--solo='))?.split('=')[1];

function etiqueta(n: string | RegExp) {
  return typeof n === 'string' ? n : String(n);
}

// Este script escribe directo en la base, sin pasar por el sitio: los rankings y
// las listas cacheadas seguirían mostrando los datos viejos hasta 1 hora. Si hay
// REVALIDAR_TOKEN (en .env.local) le pide al sitio que limpie ese caché ahora.
async function limpiarCacheDelSitio() {
  const token = process.env.REVALIDAR_TOKEN;
  const sitio = process.env.SITE_URL || 'https://orzando.com.ar';
  if (!token) {
    console.log('\nSin REVALIDAR_TOKEN: los rankings del sitio se actualizan solos en hasta 1 hora.');
    return;
  }
  try {
    const r = await fetch(`${sitio}/api/revalidar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    console.log(r.ok ? '\nCache del sitio limpiado: los rankings ya muestran los cambios.' : `\nNo se pudo limpiar el cache (${r.status}): se actualiza solo en hasta 1 hora.`);
  } catch (e) {
    console.log(`\nNo se pudo limpiar el cache (${e instanceof Error ? e.message : e}): se actualiza solo en hasta 1 hora.`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL (ver el encabezado de este archivo).');
    process.exit(1);
  }
  // Se importan recién ahora, con el entorno ya cargado (src/lib/db.ts lee DATABASE_URL al importarse).
  const { prisma } = await import('../src/lib/db');
  const { fusionarRegatistas } = await import('../src/lib/regatista-merge');
  const { fusionarClubes } = await import('../src/lib/club-merge');

  console.log(APLICAR ? '=== MODO APLICAR: se van a fusionar registros ===' : '=== SIMULACRO (no se modifica nada). Agregá --aplicar para ejecutar ===');

  const todos = await prisma.regatista.findMany({
    select: { id: true, nombre: true, _count: { select: { resultados: true } } },
  });
  const borrados = new Set<string>();
  const buscar = (n: string | RegExp) =>
    todos.filter((r) => !borrados.has(r.id) && (typeof n === 'string' ? r.nombre === n : n.test(r.nombre)));

  let hechos = 0;
  let salteados = 0;
  const resumenNiveles: Record<string, { ok: number; salteado: number }> = {};

  if (!SOLO || SOLO !== 'clubes') {
    for (const grupo of GRUPOS) {
      if (SOLO && grupo.nivel !== SOLO) continue;
      const res = (resumenNiveles[grupo.nivel] ??= { ok: 0, salteado: 0 });
      const titulo = `[${grupo.nivel}] ${etiqueta(grupo.mantener)}  ←  ${grupo.fusionar.map(etiqueta).join(', ')}`;

      // Resolver nombres → fichas.
      const dup: typeof todos = [];
      const avisos: string[] = [];
      let canonico = buscar(grupo.mantener);
      if (canonico.length > 1) {
        console.log(`SALTEADO ${titulo}\n   → hay ${canonico.length} fichas con el nombre "${etiqueta(grupo.mantener)}"`);
        res.salteado++; salteados++;
        continue;
      }
      for (const n of grupo.fusionar) {
        const encontrados = buscar(n);
        if (encontrados.length === 0) avisos.push(`no existe "${etiqueta(n)}" (¿ya fusionado?)`);
        else if (encontrados.length > 1) avisos.push(`hay ${encontrados.length} fichas llamadas "${etiqueta(n)}", se omite ese nombre`);
        else dup.push(encontrados[0]);
      }
      if (canonico.length === 0) {
        // El nombre a mantener no existe como ficha: se queda con la de más resultados del grupo.
        if (dup.length === 0) {
          console.log(`SALTEADO ${titulo}\n   → no se encontró ninguna ficha del grupo (¿ya fusionado?)`);
          res.salteado++; salteados++;
          continue;
        }
        const mejor = [...dup].sort((a, b) => b._count.resultados - a._count.resultados)[0];
        canonico = [mejor];
        dup.splice(dup.indexOf(mejor), 1);
        avisos.push(`"${etiqueta(grupo.mantener)}" no existe: se mantiene "${mejor.nombre}" (la de más resultados)`);
      }
      if (dup.length === 0) {
        console.log(`SIN TRABAJO ${titulo}\n   → ${avisos.join('; ') || 'nada para fusionar'}`);
        continue;
      }

      // Chequeo de seguridad: ¿dos fichas del grupo compiten en la misma regata?
      const miembros = [canonico[0], ...dup];
      const resultados = await prisma.resultado.findMany({
        where: { regatistaId: { in: miembros.map((m) => m.id) } },
        select: { regatistaId: true, regataId: true },
      });
      const porRegata = new Map<string, Set<string>>();
      for (const r of resultados) {
        if (!porRegata.has(r.regataId)) porRegata.set(r.regataId, new Set());
        porRegata.get(r.regataId)!.add(r.regatistaId);
      }
      const choques = [...porRegata.values()].filter((s) => s.size > 1).length;
      if (choques > 0) {
        console.log(`SALTEADO ${titulo}\n   → ${choques} regata(s) con dos fichas del grupo: son personas distintas`);
        res.salteado++; salteados++;
        continue;
      }

      console.log(`OK ${titulo}\n   → mantiene "${canonico[0].nombre}" (${canonico[0]._count.resultados} resultados); fusiona ${dup.map((d) => `"${d.nombre}" (${d._count.resultados})`).join(', ')}${avisos.length ? '\n   ⚠ ' + avisos.join('; ') : ''}`);
      if (APLICAR) {
        try {
          const resumen = await fusionarRegatistas(canonico[0].id, dup.map((d) => d.id));
          dup.forEach((d) => borrados.add(d.id));
          console.log(`   ✔ hecho: ${JSON.stringify(resumen)}`);
        } catch (e) {
          console.log(`   ✖ ERROR: ${e instanceof Error ? e.message : e}`);
          res.salteado++; salteados++;
          continue;
        }
      }
      res.ok++; hechos++;
    }
  }

  if (!SOLO || SOLO === 'clubes') {
    console.log('\n=== Clubes ===');
    const clubes = await prisma.club.findMany({ select: { id: true, nombre: true } });
    for (const [mantener, fusionar] of CLUBES) {
      const can = clubes.find((c) => c.nombre === mantener);
      const dups = fusionar.map((n) => clubes.find((c) => c.nombre === n)).filter((c): c is NonNullable<typeof c> => !!c);
      const faltan = fusionar.filter((n) => !clubes.some((c) => c.nombre === n));
      if (!can) { console.log(`SALTEADO ${mantener} ← ${fusionar.join(', ')}\n   → no existe el club "${mantener}"`); salteados++; continue; }
      if (dups.length === 0) { console.log(`SIN TRABAJO ${mantener} ← ${fusionar.join(', ')} (ya fusionado)`); continue; }
      console.log(`OK ${mantener} ← ${dups.map((d) => d.nombre).join(', ')}${faltan.length ? `   ⚠ no existen: ${faltan.join(', ')}` : ''}`);
      if (APLICAR) {
        try {
          const resumen = await fusionarClubes(can.id, dups.map((d) => d.id));
          console.log(`   ✔ hecho: ${JSON.stringify(resumen)}`);
        } catch (e) {
          console.log(`   ✖ ERROR: ${e instanceof Error ? e.message : e}`);
          salteados++;
          continue;
        }
      }
      hechos++;
    }
    console.log('\nNota: después de fusionar 400YCC en YCC revisá el nombre completo de YCC en /admin/clubes/escudos (¿Córdoba o Corrientes?).');
  }

  console.log('\n=== Resumen ===');
  for (const [nivel, r] of Object.entries(resumenNiveles)) console.log(`${nivel}: ${r.ok} ${APLICAR ? 'fusionados' : 'para fusionar'}, ${r.salteado} salteados`);
  console.log(`Total: ${hechos} ${APLICAR ? 'fusiones hechas' : 'fusiones planificadas'}, ${salteados} salteadas.`);
  if (!APLICAR) console.log('Es un simulacro: para ejecutarlo de verdad volvé a correrlo con --aplicar.');
  if (APLICAR && hechos > 0) await limpiarCacheDelSitio();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
