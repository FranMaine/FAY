import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath }));

const { refrescarSitio, refrescarRankings } = await import('../refrescar-cache');

describe('refrescarSitio', () => {
  beforeEach(() => {
    revalidateTag.mockClear();
    revalidatePath.mockClear();
  });

  it('vence los datos cacheados (etiqueta rankings) y todas las páginas ya armadas', () => {
    refrescarSitio();
    expect(revalidateTag).toHaveBeenCalledWith('rankings', { expire: 0 });
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('refrescarRankings sigue funcionando (es el mismo comportamiento)', () => {
    refrescarRankings();
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});

// Red de seguridad: las páginas públicas se guardan hasta 1 hora, así que toda
// ruta de la API que modifique datos que ellas muestran TIENE que llamar a
// refrescarSitio() (o a su alias refrescarRankings). Este test falla si alguien
// agrega una ruta nueva que escribe sin refrescar.
function rutas(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return rutas(ruta);
    return nombre === 'route.ts' ? [ruta] : [];
  });
}

// Modelos / funciones cuyo cambio se ve en páginas públicas.
const ESCRITURA_PUBLICA = /\b(?:prisma|tx)\.(regatista|resultado|campeonato|regata|club|clase|aliasRegatista|aliasClub)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\b(fusionarRegatistas|fusionarClubes|importCampeonatoResults|eliminarClubesVacios)\(/;
// Cambios de la cuenta que también se ven en la ficha (vinculación, apodo): se listan a mano.
const VISIBLES_POR_CUENTA = [
  'admin/solicitudes/[id]',
  'admin/vinculaciones/[userId]',
  'admin/usuarios/[id]',
  'vincular',
  'mi-perfil',
  'mi-perfil/foto',
];

describe('rutas que modifican datos públicos', () => {
  const base = join(process.cwd(), 'src', 'app', 'api');
  const todas = rutas(base).map((ruta) => ({
    id: relative(base, ruta).replace(/\\/g, '/').replace(/\/route\.ts$/, ''),
    codigo: readFileSync(ruta, 'utf-8'),
  }));

  it('encuentra las rutas', () => {
    expect(todas.length).toBeGreaterThan(30);
  });

  it('todas las que escriben datos públicos llaman a refrescarSitio', () => {
    const escriben = todas.filter((r) => ESCRITURA_PUBLICA.test(r.codigo));
    // Si el patrón dejara de reconocer las rutas, el test pasaría sin comprobar nada.
    expect(escriben.length).toBeGreaterThan(10);
    const sinRefresco = escriben.filter((r) => !/refrescarSitio|refrescarRankings/.test(r.codigo)).map((r) => r.id);
    expect(sinRefresco).toEqual([]);
  });

  it('las de cuenta visibles en la ficha también refrescan', () => {
    for (const id of VISIBLES_POR_CUENTA) {
      const ruta = todas.find((r) => r.id === id);
      expect(ruta, `no existe la ruta ${id}`).toBeDefined();
      expect(/refrescarSitio|refrescarRankings/.test(ruta!.codigo), `${id} no refresca`).toBe(true);
    }
  });
});
