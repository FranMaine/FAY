import { describe, it, expect } from 'vitest';
import { describirAuditoria } from '../auditoria-texto';

const reg = (accion: string, detalle: Record<string, unknown> | null = null, extra = {}) => ({
  accion,
  entidad: 'X',
  entidadId: null,
  detalle,
  ...extra,
});

describe('describirAuditoria', () => {
  it('traduce un cambio de rol a una frase con el rol en castellano', () => {
    const d = describirAuditoria(reg('usuario.cambiar_rol', { email: 'ana@mail.com', rolNuevo: 'ORGANIZADOR' }));
    expect(d.frase).toBe('cambió el rol de ana@mail.com a Organizador');
    expect(d.categoria).toBe('cuentas');
  });

  it('marca como peligrosas las eliminaciones', () => {
    expect(describirAuditoria(reg('usuario.eliminar', { email: 'a@b.com', rol: 'ORGANIZADOR' })).tono).toBe('peligro');
    expect(describirAuditoria(reg('campeonato.eliminar', { nombre: 'Copa', anio: 2026 })).tono).toBe('peligro');
  });

  it('dice qué campos se editaron en un campeonato', () => {
    const d = describirAuditoria(reg('campeonato.editar', { nombre: 'Copa', campos: ['descartes', 'fechaFin'] }));
    expect(d.frase).toBe('editó el campeonato “Copa”');
    expect(d.lineas).toEqual(['Cambió los descartes y la fecha de fin']);
  });

  it('publicar y despublicar se leen distinto', () => {
    expect(describirAuditoria(reg('campeonato.cambiar_estado', { nombre: 'Copa', estadoNuevo: 'PUBLICADO' })).frase).toBe('publicó el campeonato “Copa”');
    expect(describirAuditoria(reg('campeonato.cambiar_estado', { nombre: 'Copa', estadoNuevo: 'BORRADOR' })).tono).toBe('atencion');
  });

  it('usa el nombre del campeonato que trae el servidor para las regatas', () => {
    const d = describirAuditoria(reg('regata.editar_resultados', { numero: 3, resultados: 40 }, { campeonatoNombre: 'Copa 2026' }));
    expect(d.frase).toBe('corrigió los resultados de la regata 3 de “Copa 2026”');
    expect(d.lineas).toEqual(['Ahora tiene 40 resultados']);
  });

  it('cuenta los destinatarios de un aviso por mail en singular y plural', () => {
    expect(describirAuditoria(reg('campeonato.avisar_regatistas', { nombre: 'Copa', destinatarios: 1, tipo: 'publicacion' })).lineas[0]).toContain('1 persona recibió');
    expect(describirAuditoria(reg('campeonato.avisar_regatistas', { nombre: 'Copa', destinatarios: 5, tipo: 'actualizacion' })).lineas[0]).toContain('5 personas recibieron');
  });

  it('muestra los datos que declaró quien pidió una vinculación', () => {
    const d = describirAuditoria(reg('vinculacion.solicitar', { numeroVela: '1234', club: 'CUBA', declaro: true }));
    expect(d.lineas).toEqual(['Número de vela que declaró: 1234', 'Club que declaró: CUBA']);
  });

  it('muestra el antes y el después de un club editado', () => {
    const d = describirAuditoria(reg('club.editar', { antes: { nombre: 'CUBA', nombreCompleto: null }, despues: { nombre: 'CUBA', nombreCompleto: 'Club Universitario' } }));
    expect(d.lineas).toEqual(['Nombre completo: “—” → “Club Universitario”']);
  });

  it('una acción desconocida igual se muestra, sin romper', () => {
    expect(describirAuditoria(reg('algo.nuevo')).frase).toContain('algo.nuevo');
  });
});
