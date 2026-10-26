import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaFalso = vi.hoisted(() => ({
  auditLog: { findFirst: vi.fn() },
  campeonato: { findUnique: vi.fn() },
  user: { findMany: vi.fn() },
  favorito: { findMany: vi.fn() },
}));
const enviar = vi.hoisted(() => vi.fn());
const auditar = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: prismaFalso }));
vi.mock('@/lib/auditoria', () => ({ registrarAuditoria: auditar }));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  sendEmail: enviar,
}));

import { avisarResultadosPublicados } from '../avisos-resultados';
import { emailResultadoPublicado, emailVinculacionAprobada } from '../email';

function regatista(id: string, nombre: string) {
  return { id, nombre, clubId: null, club: null };
}

// Dos regatas, tres regatistas: Ana gana las dos, Beto es 2° y Cami 3°.
function campeonatoDePrueba(estado: 'PUBLICADO' | 'BORRADOR' = 'PUBLICADO') {
  const ana = regatista('r-ana', 'Ana Gómez');
  const beto = regatista('r-beto', 'Beto Pérez');
  const cami = regatista('r-cami', 'Cami Ruiz');
  const res = (r: ReturnType<typeof regatista>, puesto: number) => ({
    regatista: r,
    puesto,
    puntos: puesto,
    descartado: false,
    observacion: null,
    flota: null,
    flotaOrden: null,
    puestoOficial: null,
    totalOficial: null,
    datosExtra: null,
  });
  return {
    id: 'c1',
    nombre: 'Semana de Prueba',
    anio: 2026,
    estado,
    descartes: 0,
    clase: { nombre: 'J24' },
    regatas: [
      { numero: 1, resultados: [res(ana, 1), res(beto, 2), res(cami, 3)] },
      { numero: 2, resultados: [res(ana, 1), res(beto, 2), res(cami, 3)] },
    ],
  };
}

describe('avisarResultadosPublicados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFalso.auditLog.findFirst.mockResolvedValue(null);
    prismaFalso.campeonato.findUnique.mockResolvedValue(campeonatoDePrueba());
    prismaFalso.user.findMany.mockResolvedValue([
      { email: 'beto@mail.com', regatistaId: 'r-beto', regatista: { nombre: 'Beto Pérez' } },
    ]);
    prismaFalso.favorito.findMany.mockResolvedValue([]);
  });

  it('también avisa a quienes tienen a un regatista del campeonato en favoritos', async () => {
    prismaFalso.favorito.findMany.mockResolvedValue([
      { regatistaId: 'r-cami', user: { email: 'mama@mail.com' }, regatista: { nombre: 'Cami Ruiz' } },
    ]);
    const r = await avisarResultadosPublicados('c1');
    expect(r.enviados).toBe(2);
    const mail = enviar.mock.calls.map((c) => c[0]).find((m) => m.to === 'mama@mail.com');
    expect(mail.subject).toContain('Cami Ruiz');
    expect(mail.html).toContain('puesto <strong>3</strong> de 3');
    expect(mail.html).toContain('tus favoritos');
    const where = prismaFalso.favorito.findMany.mock.calls[0][0].where;
    expect(where.user).toEqual({ emailVerified: { not: null }, notificarResultados: true });
  });

  it('no le manda dos veces lo mismo a quien tiene en favoritos su propio perfil vinculado', async () => {
    prismaFalso.favorito.findMany.mockResolvedValue([
      { regatistaId: 'r-beto', user: { email: 'beto@mail.com' }, regatista: { nombre: 'Beto Pérez' } },
    ]);
    const r = await avisarResultadosPublicados('c1');
    expect(r.enviados).toBe(1);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('le manda a cada cuenta vinculada su posición final', async () => {
    const r = await avisarResultadosPublicados('c1');
    expect(r.enviados).toBe(1);
    expect(enviar).toHaveBeenCalledTimes(1);
    const mail = enviar.mock.calls[0][0];
    expect(mail.to).toBe('beto@mail.com');
    expect(mail.subject).toContain('Semana de Prueba 2026');
    expect(mail.html).toContain('puesto <strong>2</strong> de 3');
    expect(mail.html).toContain('/campeonatos/c1');
  });

  it('busca solo cuentas con el mail verificado y vinculadas a quienes figuran', async () => {
    await avisarResultadosPublicados('c1');
    const where = prismaFalso.user.findMany.mock.calls[0][0].where;
    expect(where.emailVerified).toEqual({ not: null });
    expect(where.notificarResultados).toBe(true);
    expect(where.regatistaId.in.sort()).toEqual(['r-ana', 'r-beto', 'r-cami']);
  });

  it('avisa una sola vez por campeonato', async () => {
    prismaFalso.auditLog.findFirst.mockResolvedValue({ id: 'ya-avisado' });
    const r = await avisarResultadosPublicados('c1');
    expect(r.enviados).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('deja el registro antes de mandar los mails', async () => {
    await avisarResultadosPublicados('c1');
    expect(auditar).toHaveBeenCalledTimes(1);
    expect(auditar.mock.invocationCallOrder[0]).toBeLessThan(enviar.mock.invocationCallOrder[0]);
  });

  describe('cuando el campeonato ya estaba publicado', () => {
    // Deja el aviso inicial y devuelve cómo quedó cada uno (lo que se guarda en la auditoría).
    async function fotoDelAvisoInicial() {
      await avisarResultadosPublicados('c1');
      const foto = auditar.mock.calls[0][4].posiciones;
      vi.clearAllMocks();
      prismaFalso.campeonato.findUnique.mockResolvedValue(campeonatoDePrueba());
      prismaFalso.user.findMany.mockResolvedValue([
        { email: 'beto@mail.com', regatistaId: 'r-beto', regatista: { nombre: 'Beto Pérez' } },
      ]);
      prismaFalso.favorito.findMany.mockResolvedValue([]);
      return foto;
    }

    it('no manda nada si a nadie le cambió el resultado', async () => {
      const foto = await fotoDelAvisoInicial();
      prismaFalso.auditLog.findFirst.mockResolvedValue({ id: 'a1', detalle: { posiciones: foto } });
      const r = await avisarResultadosPublicados('c1');
      expect(r.enviados).toBe(0);
      expect(enviar).not.toHaveBeenCalled();
      expect(auditar).not.toHaveBeenCalled();
    });

    it('reenvía solo a quien le cambió la posición o algún resultado, diciendo cómo estaba', async () => {
      const foto = await fotoDelAvisoInicial();
      foto['r-beto'] = [1, foto['r-beto'][1]]; // antes figuraba 1°, ahora es 2°
      prismaFalso.auditLog.findFirst.mockResolvedValue({ id: 'a1', detalle: { posiciones: foto } });

      const r = await avisarResultadosPublicados('c1');

      expect(r.enviados).toBe(1);
      const where = prismaFalso.user.findMany.mock.calls[0][0].where;
      expect(where.regatistaId.in).toEqual(['r-beto']);
      const mail = enviar.mock.calls[0][0];
      expect(mail.to).toBe('beto@mail.com');
      expect(mail.subject).toContain('Se actualizó tu resultado');
      expect(mail.html).toContain('puesto <strong>2</strong> de 3');
      expect(mail.html).toContain('antes figuraba en el 1');
      expect(auditar.mock.calls[0][4].tipo).toBe('actualizacion');
    });

    it('detecta el cambio aunque la posición final sea la misma (cambió una regata)', async () => {
      const foto = await fotoDelAvisoInicial();
      foto['r-beto'] = [foto['r-beto'][0], 'otra-huella'];
      prismaFalso.auditLog.findFirst.mockResolvedValue({ id: 'a1', detalle: { posiciones: foto } });
      const r = await avisarResultadosPublicados('c1');
      expect(r.enviados).toBe(1);
    });

    it('si el aviso anterior no guardó cómo quedó cada uno, solo deja el punto de partida', async () => {
      prismaFalso.auditLog.findFirst.mockResolvedValue({ id: 'viejo', detalle: { nombre: 'x', destinatarios: 3 } });
      const r = await avisarResultadosPublicados('c1');
      expect(r.enviados).toBe(0);
      expect(enviar).not.toHaveBeenCalled();
      expect(auditar.mock.calls[0][4].tipo).toBe('punto_de_partida');
    });
  });

  it('no avisa si el campeonato no está publicado', async () => {
    prismaFalso.campeonato.findUnique.mockResolvedValue(campeonatoDePrueba('BORRADOR'));
    const r = await avisarResultadosPublicados('c1');
    expect(r.enviados).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('un error no se propaga (la publicación ya se hizo)', async () => {
    prismaFalso.campeonato.findUnique.mockRejectedValue(new Error('base caída'));
    await expect(avisarResultadosPublicados('c1')).resolves.toEqual({ enviados: 0 });
  });
});

describe('plantillas de mail', () => {
  it('el aviso de resultado escapa HTML en los nombres', () => {
    const { html } = emailResultadoPublicado({
      nombreRegatista: '<img src=x onerror=alert(1)>',
      campeonato: 'Copa <b>X</b>',
      clase: 'J24',
      anio: 2026,
      posicion: 1,
      totalParticipantes: 10,
      urlCampeonato: 'https://orzando.com.ar/campeonatos/c1',
      urlConfiguracion: 'https://orzando.com.ar/mi-perfil/configuracion',
    });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>X</b>');
  });

  it('el aviso omite la posición si no se pudo calcular', () => {
    const { html } = emailResultadoPublicado({
      nombreRegatista: 'Ana',
      campeonato: 'Copa',
      clase: 'J24',
      anio: 2026,
      posicion: null,
      totalParticipantes: 10,
      urlCampeonato: 'https://orzando.com.ar/campeonatos/c1',
      urlConfiguracion: 'https://orzando.com.ar/mi-perfil/configuracion',
    });
    expect(html).not.toContain('Terminaste');
  });

  it('el mail de vinculación aprobada lleva el link al perfil', () => {
    const { html } = emailVinculacionAprobada('Ana Gómez', 'https://orzando.com.ar/mi-perfil');
    expect(html).toContain('https://orzando.com.ar/mi-perfil');
    expect(html).toContain('Ana Gómez');
  });
});
