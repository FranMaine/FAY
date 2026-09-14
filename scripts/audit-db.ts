// Auditoría de calidad de datos -SOLO LECTURA, no modifica nada. Corre
// varios chequeos sobre la base completa buscando regatistas duplicados
// (exactos y "subconjunto", ej: "Pérez" cargado aparte de "Juan Pérez"),
// campeonatos que puedan haberse importado mal (muchos participantes con
// nombre de una sola palabra), y otros datos atípicos generales.
import { PrismaClient } from "@prisma/client";
import { normalizarNombre } from "../src/lib/nombres";

const prisma = new PrismaClient();

function tokens(nombre: string): string[] {
  return normalizarNombre(nombre).split(" ").filter(Boolean);
}

async function main() {
  console.log("=== Cargando datos ===");
  const regatistas = await prisma.regatista.findMany({
    include: {
      club: true,
      _count: { select: { resultados: true } },
      resultados: {
        select: {
          regata: { select: { campeonatoId: true, campeonato: { select: { nombre: true, anio: true } } } },
        },
      },
    },
  });
  console.log(`Regatistas: ${regatistas.length}`);

  // ---------------------------------------------------------------------
  // 1. Duplicados EXACTOS (mismo nombre normalizado) -ya los detecta
  //    /admin/regatistas/duplicados, acá solo contamos para referencia.
  // ---------------------------------------------------------------------
  const porNombreExacto = new Map<string, typeof regatistas>();
  for (const r of regatistas) {
    const clave = normalizarNombre(r.nombre);
    if (!porNombreExacto.has(clave)) porNombreExacto.set(clave, []);
    porNombreExacto.get(clave)!.push(r);
  }
  const gruposExactos = [...porNombreExacto.values()].filter((g) => g.length > 1);
  console.log(`\n=== 1. Duplicados exactos (nombre normalizado idéntico) ===`);
  console.log(`Grupos: ${gruposExactos.length}, regatistas involucrados: ${gruposExactos.reduce((a, g) => a + g.length, 0)}`);

  // ---------------------------------------------------------------------
  // 2. Duplicados "subconjunto": un regatista de UNA sola palabra (ej:
  //    "Perez") cuyo token aparece dentro del nombre de otro regatista de
  //    dos o más palabras (ej: "Juan Perez") -el patrón típico de "el
  //    campeonato solo traía el apellido y se cargó como regatista nuevo".
  // ---------------------------------------------------------------------
  const porToken = new Map<string, typeof regatistas>();
  for (const r of regatistas) {
    for (const t of tokens(r.nombre)) {
      if (!porToken.has(t)) porToken.set(t, []);
      porToken.get(t)!.push(r);
    }
  }

  const unaPalabra = regatistas.filter((r) => tokens(r.nombre).length === 1);
  console.log(`\n=== 2. Regatistas con nombre de una sola palabra: ${unaPalabra.length} ===`);

  interface CandidatoSubset {
    corto: (typeof regatistas)[number];
    largos: (typeof regatistas)[number][];
  }
  const candidatosSubset: CandidatoSubset[] = [];
  for (const r of unaPalabra) {
    const t = tokens(r.nombre)[0];
    const conMismoToken = (porToken.get(t) || []).filter(
      (o) => o.id !== r.id && tokens(o.nombre).length > 1 && tokens(o.nombre).includes(t)
    );
    if (conMismoToken.length > 0) {
      candidatosSubset.push({ corto: r, largos: conMismoToken });
    }
  }
  console.log(`Candidatos "apellido solo" que calzan con un nombre completo existente: ${candidatosSubset.length}`);
  for (const c of candidatosSubset.slice(0, 60)) {
    const campeonatosCorto = [...new Set(c.corto.resultados.map((res) => `${res.regata.campeonato.nombre} ${res.regata.campeonato.anio}`))];
    console.log(
      `  "${c.corto.nombre}" (club: ${c.corto.club?.nombre ?? "-"}, ${c.corto._count.resultados} resultado(s), campeonatos: ${campeonatosCorto.join(" | ")}) ` +
      `≈ ${c.largos.map((l) => `"${l.nombre}" (club: ${l.club?.nombre ?? "-"}, ${l._count.resultados} res.)`).join(" / ")}`
    );
  }
  if (candidatosSubset.length > 60) console.log(`  ...y ${candidatosSubset.length - 60} más`);

  // ---------------------------------------------------------------------
  // 3. Por campeonato: fracción de participantes con nombre de 1 sola
  //    palabra -si un campeonato tiene una fracción mucho más alta que el
  //    resto, es el candidato a "se importó mal, solo trajo apellidos".
  // ---------------------------------------------------------------------
  console.log(`\n=== 3. Fracción de nombres de 1 palabra por campeonato (candidatos a import roto) ===`);
  const porCampeonato = new Map<string, { nombre: string; anio: number; total: Set<string>; unaPalabra: Set<string> }>();
  for (const r of regatistas) {
    const esUnaPalabra = tokens(r.nombre).length === 1;
    for (const res of r.resultados) {
      const campId = res.regata.campeonatoId;
      if (!porCampeonato.has(campId)) {
        porCampeonato.set(campId, {
          nombre: res.regata.campeonato.nombre,
          anio: res.regata.campeonato.anio,
          total: new Set(),
          unaPalabra: new Set(),
        });
      }
      const entry = porCampeonato.get(campId)!;
      entry.total.add(r.id);
      if (esUnaPalabra) entry.unaPalabra.add(r.id);
    }
  }
  const filas = [...porCampeonato.entries()]
    .map(([id, e]) => ({ id, ...e, frac: e.unaPalabra.size / e.total.size }))
    .filter((e) => e.unaPalabra.size > 0)
    .sort((a, b) => b.frac - a.frac);
  for (const f of filas.slice(0, 20)) {
    console.log(`  ${(f.frac * 100).toFixed(0)}% (${f.unaPalabra.size}/${f.total.size}) -- ${f.nombre} ${f.anio} [${f.id}]`);
  }

  // ---------------------------------------------------------------------
  // 4. Regatistas sin ningún resultado (huérfanos) -no es necesariamente
  //    un error, pero vale la pena saber cuántos hay.
  // ---------------------------------------------------------------------
  const sinResultados = regatistas.filter((r) => r._count.resultados === 0);
  console.log(`\n=== 4. Regatistas sin ningún resultado cargado: ${sinResultados.length} ===`);

  // ---------------------------------------------------------------------
  // 5. Nombres con caracteres raros: dígitos, saltos de línea/tabs
  //    remanentes, o muy cortos (1-2 caracteres).
  // ---------------------------------------------------------------------
  const nombresRaros = regatistas.filter(
    (r) => /\d/.test(r.nombre) || /[\n\t\r]/.test(r.nombre) || r.nombre.trim().length <= 2
  );
  console.log(`\n=== 5. Nombres con dígitos/saltos de línea/muy cortos: ${nombresRaros.length} ===`);
  for (const r of nombresRaros.slice(0, 30)) {
    console.log(`  "${JSON.stringify(r.nombre)}" (id ${r.id}, club: ${r.club?.nombre ?? "-"}, ${r._count.resultados} resultado(s))`);
  }

  // ---------------------------------------------------------------------
  // 6. Clubes atípicos: nombre muy corto, numérico, o placeholders.
  // ---------------------------------------------------------------------
  const clubes = await prisma.club.findMany({ include: { _count: { select: { regatistas: true, campeonatos: true } } } });
  const clubesRaros = clubes.filter(
    (c) => c.nombre.trim().length <= 1 || /^\d+$/.test(c.nombre.trim()) || /^(n\/a|sin club|-|s\/d)$/i.test(c.nombre.trim())
  );
  console.log(`\n=== 6. Clubes con nombre atípico: ${clubesRaros.length} (de ${clubes.length} totales) ===`);
  for (const c of clubesRaros) {
    console.log(`  "${c.nombre}" (id ${c.id}, ${c._count.regatistas} regatista(s), ${c._count.campeonatos} campeonato(s) como sede)`);
  }

  // ---------------------------------------------------------------------
  // 7. Campeonatos sin ninguna regata cargada (posible importación a
  //    medias) y campeonatos PUBLICADOS sin ningún resultado.
  // ---------------------------------------------------------------------
  const campeonatos = await prisma.campeonato.findMany({
    include: { clase: true, _count: { select: { regatas: true } }, regatas: { include: { _count: { select: { resultados: true } } } } },
  });
  const sinRegatas = campeonatos.filter((c) => c._count.regatas === 0);
  const publicadosSinResultados = campeonatos.filter(
    (c) => c.estado === "PUBLICADO" && c.regatas.every((reg) => reg._count.resultados === 0)
  );
  console.log(`\n=== 7. Campeonatos sin regatas cargadas: ${sinRegatas.length} ===`);
  for (const c of sinRegatas) console.log(`  "${c.nombre}" ${c.anio} (${c.clase.nombre}) [${c.id}] estado=${c.estado}`);
  console.log(`\n=== 7b. Campeonatos PUBLICADOS sin ningún resultado: ${publicadosSinResultados.length} ===`);
  for (const c of publicadosSinResultados) console.log(`  "${c.nombre}" ${c.anio} (${c.clase.nombre}) [${c.id}]`);

  // ---------------------------------------------------------------------
  // 8. Campeonatos "duplicados": mismo nombre + año + clase (no debería
  //    pasar dos veces, a diferencia de mismo nombre en clases distintas
  //    que sí es válido -ej "Vela Fest" una vez por clase).
  // ---------------------------------------------------------------------
  const porNombreAnioClase = new Map<string, typeof campeonatos>();
  for (const c of campeonatos) {
    const clave = `${c.nombre.trim().toLowerCase()}__${c.anio}__${c.claseId}`;
    if (!porNombreAnioClase.has(clave)) porNombreAnioClase.set(clave, []);
    porNombreAnioClase.get(clave)!.push(c);
  }
  const campeonatosDuplicados = [...porNombreAnioClase.values()].filter((g) => g.length > 1);
  console.log(`\n=== 8. Campeonatos con mismo nombre+año+clase repetido: ${campeonatosDuplicados.length} grupo(s) ===`);
  for (const g of campeonatosDuplicados) {
    console.log(`  "${g[0].nombre}" ${g[0].anio} (${g[0].clase.nombre}): ${g.map((c) => c.id).join(", ")}`);
  }

  // ---------------------------------------------------------------------
  // 9. Resultados con valores imposibles: puesto <= 0, o puntos negativos
  //    (fuera de los sistemas de puntaje que puntúan negativo, no es el
  //    caso acá).
  // ---------------------------------------------------------------------
  const resultadosRaros = await prisma.resultado.findMany({
    where: { OR: [{ puesto: { lte: 0 } }, { puntos: { lt: 0 } }] },
    include: { regatista: true, regata: { include: { campeonato: true } } },
  });
  console.log(`\n=== 9. Resultados con puesto<=0 o puntos negativos: ${resultadosRaros.length} ===`);
  for (const r of resultadosRaros.slice(0, 30)) {
    console.log(`  ${r.regatista.nombre} -- ${r.regata.campeonato.nombre} ${r.regata.campeonato.anio} R${r.regata.numero}: puesto=${r.puesto} puntos=${r.puntos}`);
  }

  console.log("\n=== FIN ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
