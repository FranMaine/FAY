import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake chico y específico (mismo criterio que fake-prisma.ts, pero acá
// alcanza con club.findUnique({ select: { _count } }) y club.delete -no
// vale la pena sumarle soporte de _count al fake compartido para esto).
interface ClubRow {
  id: string;
  nombre: string;
  regatistasCount: number;
  regatistasSecundariosCount: number;
  campeonatosCount: number;
}

let clubes: ClubRow[];
const auditLog: unknown[][] = [];

vi.mock("@/lib/db", () => ({
  get prisma() {
    return {
      club: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const c = clubes.find((x) => x.id === where.id);
          if (!c) return null;
          return {
            nombre: c.nombre,
            _count: {
              regatistas: c.regatistasCount,
              regatistasSecundarios: c.regatistasSecundariosCount,
              campeonatos: c.campeonatosCount,
            },
          };
        },
        delete: async ({ where }: { where: { id: string } }) => {
          const idx = clubes.findIndex((x) => x.id === where.id);
          if (idx === -1) throw new Error(`No encontrado: ${where.id}`);
          return clubes.splice(idx, 1)[0];
        },
      },
    };
  },
}));

vi.mock("@/lib/auditoria", () => ({
  registrarAuditoria: vi.fn(async (...args: unknown[]) => {
    auditLog.push(args);
  }),
}));

const { eliminarClubesVacios } = await import("../club-cleanup");

describe("eliminarClubesVacios", () => {
  beforeEach(() => {
    clubes = [
      { id: "vacio", nombre: "Club Vacío", regatistasCount: 0, regatistasSecundariosCount: 0, campeonatosCount: 0 },
      { id: "con-miembros", nombre: "Club Con Miembros", regatistasCount: 3, regatistasSecundariosCount: 0, campeonatosCount: 0 },
      { id: "secundarios", nombre: "Club Solo Secundarios", regatistasCount: 0, regatistasSecundariosCount: 2, campeonatosCount: 0 },
      { id: "sede", nombre: "Club Sede Sin Miembros", regatistasCount: 0, regatistasSecundariosCount: 0, campeonatosCount: 1 },
    ];
    auditLog.length = 0;
  });

  it("borra un club sin ningún miembro y sin ser sede", async () => {
    const borrados = await eliminarClubesVacios(["vacio"]);
    expect(borrados).toEqual(["vacio"]);
    expect(clubes.find((c) => c.id === "vacio")).toBeUndefined();
  });

  it("no toca un club que todavía tiene miembros principales", async () => {
    const borrados = await eliminarClubesVacios(["con-miembros"]);
    expect(borrados).toEqual([]);
    expect(clubes.find((c) => c.id === "con-miembros")).toBeDefined();
  });

  it("no toca un club que solo tiene miembros secundarios (doble club)", async () => {
    const borrados = await eliminarClubesVacios(["secundarios"]);
    expect(borrados).toEqual([]);
  });

  it("no borra un club sede aunque tenga cero regatistas", async () => {
    const borrados = await eliminarClubesVacios(["sede"]);
    expect(borrados).toEqual([]);
    expect(clubes.find((c) => c.id === "sede")).toBeDefined();
  });

  it("ignora ids null/undefined y no repite el mismo id dos veces", async () => {
    const borrados = await eliminarClubesVacios([null, "vacio", "vacio", undefined]);
    expect(borrados).toEqual(["vacio"]);
  });

  it("no rompe si el club ya no existe", async () => {
    const borrados = await eliminarClubesVacios(["no-existe"]);
    expect(borrados).toEqual([]);
  });

  it("registra auditoría solo cuando se pasa un actor", async () => {
    await eliminarClubesVacios(["vacio"]);
    expect(auditLog.length).toBe(0);

    clubes.push({ id: "vacio2", nombre: "Otro Vacío", regatistasCount: 0, regatistasSecundariosCount: 0, campeonatosCount: 0 });
    await eliminarClubesVacios(["vacio2"], { email: "admin@test.com" });
    expect(auditLog.length).toBe(1);
  });
});
