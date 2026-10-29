// Traduce un registro de auditoría (acción técnica + datos crudos) a algo que
// cualquiera entienda: una frase, unas líneas de detalle y una categoría. Sin
// base de datos ni React, para poder probarlo.

export type CategoriaAuditoria =
  | 'cuentas'
  | 'perfiles'
  | 'favoritos'
  | 'vinculaciones'
  | 'campeonatos'
  | 'regatas'
  | 'regatistas'
  | 'clubes'
  | 'automaticas';

export type Tono = 'normal' | 'positivo' | 'atencion' | 'peligro';

export const CATEGORIAS: Record<CategoriaAuditoria, string> = {
  cuentas: 'Cuentas',
  perfiles: 'Perfiles',
  favoritos: 'Favoritos',
  vinculaciones: 'Vinculaciones',
  campeonatos: 'Campeonatos',
  regatas: 'Regatas',
  regatistas: 'Regatistas',
  clubes: 'Clubes',
  automaticas: 'Automáticas',
};

export interface RegistroAuditoria {
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: Record<string, unknown> | null;
  /** Nombre de la entidad afectada, si el servidor pudo averiguarlo (campeonato, regatista, club). */
  entidadNombre?: string | null;
  /** Nombre del campeonato de la regata, si corresponde. */
  campeonatoNombre?: string | null;
}

export interface Descripcion {
  categoria: CategoriaAuditoria;
  /** Sigue al nombre de quien lo hizo: "Fran Maine" + "cambió el rol de ana@mail a Administrador". */
  frase: string;
  /** Datos extra ya traducidos, uno por línea. */
  lineas: string[];
  tono: Tono;
}

const ROLES: Record<string, string> = {
  ADMIN: 'Administrador',
  ORGANIZADOR: 'Organizador',
  REGULAR: 'Usuario regular',
};
const USOS: Record<string, string> = {
  NAVEGANTE: 'navegante',
  FAMILIAR: 'familiar de quien compite',
  ESPECTADOR: 'solo mira la página',
};
const CAMPOS: Record<string, string> = {
  nombre: 'el nombre',
  evento: 'el evento',
  anio: 'el año',
  sedeId: 'la sede',
  fechaInicio: 'la fecha de inicio',
  fechaFin: 'la fecha de fin',
  descartes: 'los descartes',
  claseId: 'la clase',
  estado: 'el estado',
  logoUrl: 'el logo',
  fuenteUrl: 'la fuente',
};

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function entre(nombre: string | null, porDefecto: string): string {
  return nombre ? `“${nombre}”` : porDefecto;
}
function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}
function lista(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export function describirAuditoria(r: RegistroAuditoria): Descripcion {
  const d = r.detalle ?? {};
  const email = texto(d.email);
  const nombre = texto(d.nombre) ?? r.entidadNombre ?? null;
  const camp = entre(nombre, 'un campeonato');
  const quien = email ?? r.entidadNombre ?? 'una cuenta';

  switch (r.accion) {
    // ---- Cuentas
    case 'usuario.registrarse':
      return { categoria: 'cuentas', frase: 'creó su cuenta', lineas: email ? [email] : [], tono: 'positivo' };
    case 'usuario.cambiar_rol':
      return {
        categoria: 'cuentas',
        frase: `cambió el rol de ${quien} a ${ROLES[String(d.rolNuevo)] ?? texto(d.rolNuevo) ?? 'otro rol'}`,
        lineas: [],
        tono: 'atencion',
      };
    case 'usuario.eliminar':
      return {
        categoria: 'cuentas',
        frase: `eliminó la cuenta de ${quien}`,
        lineas: [ROLES[String(d.rol)] ? `Tenía el rol ${ROLES[String(d.rol)]}` : '', d.teniaRegatista ? 'Estaba vinculada a un perfil de regatista (el perfil se conserva)' : ''].filter(Boolean),
        tono: 'peligro',
      };
    case 'usuario.eliminar_propia':
      return {
        categoria: 'cuentas',
        frase: 'eliminó su propia cuenta',
        lineas: [email ?? '', d.teniaRegatista ? 'Estaba vinculada a un perfil de regatista (el perfil se conserva)' : ''].filter(Boolean),
        tono: 'peligro',
      };
    case 'usuario.quitar_apodo':
      return {
        categoria: 'cuentas',
        frase: `quitó el apodo de ${quien}`,
        lineas: texto(d.apodoAnterior) ? [`El apodo era “${texto(d.apodoAnterior)}”`] : [],
        tono: 'atencion',
      };

    // ---- Perfil propio
    case 'perfil.cambiar_apodo': {
      const antes = texto(d.apodoAnterior);
      const ahora = texto(d.apodoNuevo);
      return {
        categoria: 'perfiles',
        frase: ahora ? `cambió su apodo a “${ahora}”` : 'borró su apodo',
        lineas: antes ? [`Antes: “${antes}”`] : [],
        tono: 'normal',
      };
    }
    case 'perfil.cambiar_avisos':
      return { categoria: 'perfiles', frase: d.notificarResultados ? 'activó los avisos por mail de su perfil' : 'desactivó los avisos por mail de su perfil', lineas: [], tono: 'normal' };
    case 'perfil.cambiar_avisos_favoritos':
      return { categoria: 'perfiles', frase: d.notificarFavoritos ? 'activó los avisos por mail de sus favoritos' : 'desactivó los avisos por mail de sus favoritos', lineas: [], tono: 'normal' };
    case 'perfil.cambiar_foto':
      return { categoria: 'perfiles', frase: 'cambió su foto de perfil', lineas: [], tono: 'normal' };
    case 'perfil.quitar_foto':
      return { categoria: 'perfiles', frase: 'quitó su foto de perfil', lineas: [], tono: 'normal' };
    case 'perfil.cambiar_password':
      return { categoria: 'perfiles', frase: 'cambió su contraseña', lineas: [], tono: 'normal' };
    case 'perfil.elegir_uso':
      return { categoria: 'perfiles', frase: `eligió cómo usa el sitio: ${USOS[String(d.perfilUso)] ?? texto(d.perfilUso) ?? 'sin dato'}`, lineas: [], tono: 'normal' };

    // ---- Favoritos
    case 'favorito.agregar':
      return { categoria: 'favoritos', frase: `agregó a ${entre(nombre, 'un regatista')} a sus favoritos`, lineas: [], tono: 'positivo' };
    case 'favorito.quitar':
      return { categoria: 'favoritos', frase: `sacó a ${entre(nombre, 'un regatista')} de sus favoritos`, lineas: [], tono: 'normal' };

    // ---- Vinculaciones
    case 'vinculacion.solicitar': {
      const lineas = [
        texto(d.numeroVela) ? `Número de vela que declaró: ${texto(d.numeroVela)}` : '',
        texto(d.club) ? `Club que declaró: ${texto(d.club)}` : '',
        texto(d.ultimoCampeonato) ? `Último campeonato que declaró: ${texto(d.ultimoCampeonato)}` : '',
      ].filter(Boolean);
      return { categoria: 'vinculaciones', frase: 'pidió vincular su cuenta a un perfil de regatista', lineas, tono: 'atencion' };
    }
    case 'vinculacion.aprobar':
      return { categoria: 'vinculaciones', frase: 'aprobó una vinculación de cuenta con un perfil de regatista', lineas: [], tono: 'positivo' };
    case 'vinculacion.rechazar':
      return { categoria: 'vinculaciones', frase: 'rechazó una vinculación de cuenta con un perfil de regatista', lineas: [], tono: 'atencion' };
    case 'vinculacion.revocar':
      return {
        categoria: 'vinculaciones',
        frase: `desvinculó a ${quien}${texto(d.regatista) ? ` del perfil de ${texto(d.regatista)}` : ' de su perfil de regatista'}`,
        lineas: [],
        tono: 'atencion',
      };
    case 'vinculacion.desvincular':
      return { categoria: 'vinculaciones', frase: 'se desvinculó de su perfil de regatista', lineas: [], tono: 'normal' };

    // ---- Campeonatos
    case 'campeonato.crear':
      return { categoria: 'campeonatos', frase: `creó el campeonato ${camp}`, lineas: num(d.anio) ? [`Año ${num(d.anio)}`] : [], tono: 'positivo' };
    case 'campeonato.editar': {
      const campos = Array.isArray(d.campos) ? d.campos.map((c) => CAMPOS[String(c)] ?? String(c)) : [];
      return {
        categoria: 'campeonatos',
        frase: `editó el campeonato ${camp}`,
        lineas: campos.length ? [`Cambió ${lista(campos)}`] : [],
        tono: 'normal',
      };
    }
    case 'campeonato.cambiar_estado': {
      const publicado = d.estadoNuevo === 'PUBLICADO';
      return {
        categoria: 'campeonatos',
        frase: publicado ? `publicó el campeonato ${camp}` : `pasó a borrador el campeonato ${camp}`,
        lineas: publicado ? [] : ['Dejó de verse en el sitio'],
        tono: publicado ? 'positivo' : 'atencion',
      };
    }
    case 'campeonato.eliminar':
      return { categoria: 'campeonatos', frase: `eliminó el campeonato ${camp}`, lineas: num(d.anio) ? [`Año ${num(d.anio)}`, 'Se borraron también sus regatas y resultados'] : ['Se borraron también sus regatas y resultados'], tono: 'peligro' };
    case 'campeonato.importar_resultados':
      return { categoria: 'campeonatos', frase: `importó resultados en ${camp}`, lineas: texto(d.archivo) ? [`Archivo: ${texto(d.archivo)}`] : [], tono: 'normal' };
    case 'campeonato.cambiar_logo':
      return { categoria: 'campeonatos', frase: `cambió el logo del campeonato ${camp}`, lineas: [], tono: 'normal' };
    case 'campeonato.quitar_logo':
      return { categoria: 'campeonatos', frase: `quitó el logo del campeonato ${camp}`, lineas: [], tono: 'normal' };
    case 'campeonato.avisar_regatistas': {
      const n = num(d.destinatarios) ?? 0;
      const tipo = d.tipo === 'actualizacion' ? 'actualización' : d.tipo === 'punto_de_partida' ? 'punto de partida' : 'publicación';
      return {
        categoria: 'automaticas',
        frase: d.tipo === 'punto_de_partida' ? `guardó cómo quedó ${camp} para detectar cambios futuros` : `avisó por mail los resultados de ${camp}`,
        lineas: d.tipo === 'punto_de_partida' ? [] : [`${plural(n, 'persona recibió', 'personas recibieron')} el aviso (${tipo})`],
        tono: 'normal',
      };
    }

    // ---- Regatas
    case 'regata.crear': {
      const n = num(d.resultados);
      return {
        categoria: 'regatas',
        frase: `cargó la regata ${num(d.numero) ?? ''} ${r.campeonatoNombre ? `de ${entre(r.campeonatoNombre, '')}` : 'de un campeonato'}`.replace(/\s+/g, ' ').trim(),
        lineas: n !== null ? [`${plural(n, 'resultado cargado', 'resultados cargados')}`] : [],
        tono: 'positivo',
      };
    }
    case 'regata.editar_resultados': {
      const n = num(d.resultados);
      return {
        categoria: 'regatas',
        frase: `corrigió los resultados de la regata ${num(d.numero) ?? ''} ${r.campeonatoNombre ? `de ${entre(r.campeonatoNombre, '')}` : 'de un campeonato'}`.replace(/\s+/g, ' ').trim(),
        lineas: n !== null ? [`Ahora tiene ${plural(n, 'resultado', 'resultados')}`] : [],
        tono: 'normal',
      };
    }

    // ---- Regatistas
    case 'regatista.crear':
      return { categoria: 'regatistas', frase: `creó al regatista ${entre(nombre, '')}`.trim(), lineas: [], tono: 'positivo' };
    case 'regatista.editar':
      return { categoria: 'regatistas', frase: `editó al regatista ${entre(nombre, '')}`.trim(), lineas: texto(d.pais) ? [`País: ${texto(d.pais)}`] : [], tono: 'normal' };
    case 'regatista.renombrar':
      return {
        categoria: 'regatistas',
        frase: `cambió el nombre de ${entre(texto(d.nombreAnterior), 'un regatista')} a ${entre(texto(d.nombreNuevo), 'otro nombre')}`,
        lineas: [],
        tono: 'normal',
      };
    case 'regatista.cambiar_club': {
      const n = Array.isArray(d.clubIds) ? d.clubIds.length : 0;
      return {
        categoria: 'regatistas',
        frase: `cambió el club de ${entre(r.entidadNombre ?? null, 'un regatista')}`,
        lineas: [n === 0 ? 'Quedó sin club' : n === 1 ? 'Ahora tiene 1 club' : `Ahora tiene ${n} clubes`],
        tono: 'normal',
      };
    }
    case 'regatista.fusionar': {
      const n = Array.isArray(d.duplicadoIds) ? d.duplicadoIds.length : 0;
      const resumen = (d.resumen ?? {}) as Record<string, unknown>;
      const movidos = num(resumen.resultadosMovidos);
      return {
        categoria: 'regatistas',
        frase: `unió ${plural(n, 'ficha duplicada', 'fichas duplicadas')} en la de ${entre(r.entidadNombre ?? null, 'un regatista')}`,
        lineas: movidos !== null ? [`${plural(movidos, 'resultado pasó', 'resultados pasaron')} a la ficha que quedó`] : [],
        tono: 'atencion',
      };
    }

    // ---- Clubes
    case 'club.crear':
      return { categoria: 'clubes', frase: `creó el club ${entre(nombre, '')}`.trim(), lineas: [], tono: 'positivo' };
    case 'club.editar': {
      const antes = (d.antes ?? {}) as Record<string, unknown>;
      const despues = (d.despues ?? {}) as Record<string, unknown>;
      const lineas: string[] = [];
      if (texto(antes.nombre) !== texto(despues.nombre)) lineas.push(`Nombre: “${texto(antes.nombre) ?? '—'}” → “${texto(despues.nombre) ?? '—'}”`);
      if (texto(antes.nombreCompleto) !== texto(despues.nombreCompleto)) lineas.push(`Nombre completo: “${texto(antes.nombreCompleto) ?? '—'}” → “${texto(despues.nombreCompleto) ?? '—'}”`);
      return { categoria: 'clubes', frase: `editó el club ${entre(texto(despues.nombre) ?? nombre, '')}`.trim(), lineas, tono: 'normal' };
    }
    case 'club.eliminar':
      return { categoria: 'clubes', frase: `eliminó el club ${entre(nombre, '')}`.trim(), lineas: [], tono: 'peligro' };
    case 'club.fusionar': {
      const n = Array.isArray(d.duplicadoIds) ? d.duplicadoIds.length : 0;
      return { categoria: 'clubes', frase: `unió ${plural(n, 'club duplicado', 'clubes duplicados')} en ${entre(r.entidadNombre ?? null, 'otro club')}`, lineas: [], tono: 'atencion' };
    }
    case 'club.auto_eliminar_vacio':
      return { categoria: 'automaticas', frase: `eliminó el club vacío ${entre(nombre, '')}`.trim(), lineas: ['Se borró solo porque se quedó sin regatistas'], tono: 'normal' };
    case 'club.cambiar_logo':
      return { categoria: 'clubes', frase: `cambió el escudo del club ${entre(nombre, '')}`.trim(), lineas: [], tono: 'normal' };
    case 'club.quitar_logo':
      return { categoria: 'clubes', frase: `quitó el escudo del club ${entre(nombre, '')}`.trim(), lineas: [], tono: 'normal' };

    // ---- Importación automática (Barlovento)
    case 'barlovento.importar': {
      const partes = [
        num(d.participantes) !== null ? plural(num(d.participantes)!, 'participante', 'participantes') : '',
        num(d.regatas) !== null ? plural(num(d.regatas)!, 'regata', 'regatas') : '',
        num(d.descartes) !== null ? plural(num(d.descartes)!, 'descarte', 'descartes') : '',
      ].filter(Boolean);
      return { categoria: 'automaticas', frase: `importó y publicó resultados de ${camp} desde Barlovento`, lineas: partes.length ? [partes.join(' · ')] : [], tono: 'positivo' };
    }
    case 'barlovento.fallo':
      return {
        categoria: 'automaticas',
        frase: 'no pudo importar el archivo de resultados de Barlovento',
        lineas: texto(d.motivo) ? [texto(d.motivo)!] : [],
        tono: 'peligro',
      };

    default:
      return { categoria: 'automaticas', frase: `registró una acción (${r.accion})`, lineas: [], tono: 'normal' };
  }
}
