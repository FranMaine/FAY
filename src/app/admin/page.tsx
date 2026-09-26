import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Trophy, Users, AlertCircle, AlertTriangle, ArrowUpRight, Shield, ShieldCheck, ScrollText, Mail, Anchor, LinkIcon, SailboatIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

// Estas tarjetas antes mostraban números fijos ("45 campeonatos", etc.) -
// forzamos que esta página siempre pegue a la base al abrirse, en vez de
// quedar cacheada, para que el conteo esté siempre al día.
export const dynamic = "force-dynamic";

async function getStats() {
  const [campeonatos, regatistas, clases, solicitudesPendientes, erroresRecientes] = await Promise.all([
    prisma.campeonato.count(),
    prisma.regatista.count(),
    prisma.clase.count(),
    prisma.solicitudVinculacion.count({ where: { estado: "PENDIENTE" } }),
    prisma.errorLog.count(),
  ]);

  return { campeonatos, regatistas, clases, solicitudesPendientes, erroresRecientes };
}

export default async function AdminDashboardPage() {
  // El layout de /admin ya deja pasar tanto a ADMIN como a ORGANIZADOR
  // (ver src/app/admin/layout.tsx) porque ambos necesitan entrar a
  // /admin/campeonatos -este dashboard en particular (estadísticas
  // generales, accesos a clubes/regatistas/errores/usuarios) sí es
  // exclusivo de ADMIN, así que un ORGANIZADOR que aterriza en /admin va
  // directo a la única sección que le corresponde.
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/admin/campeonatos");
  }

  const stats = await getStats();

  const numeros = [
    { etiqueta: "Campeonatos", valor: stats.campeonatos, icono: Trophy, alerta: false, color: "text-primary" },
    { etiqueta: "Regatistas", valor: stats.regatistas, icono: Users, alerta: false, color: "text-primary" },
    { etiqueta: "Clases", valor: stats.clases, icono: SailboatIcon, alerta: false, color: "text-primary" },
    { etiqueta: "Revisión pendiente", valor: stats.solicitudesPendientes, icono: AlertCircle, alerta: stats.solicitudesPendientes > 0, color: "text-amber-500" },
    { etiqueta: "Errores", valor: stats.erroresRecientes, icono: AlertTriangle, alerta: stats.erroresRecientes > 0, color: "text-red-500" },
  ];

  const accesos = [
    { href: "/admin/campeonatos", titulo: "Campeonatos", detalle: "Crear, editar y publicar campeonatos", icono: Trophy },
    { href: "/admin/regatistas", titulo: "Regatistas", detalle: "Administrar perfiles, duplicados y fusiones", icono: Users },
    { href: "/admin/clubes", titulo: "Clubes", detalle: "Escudos, nombres, fusiones y siglas ambiguas", icono: Anchor },
    { href: "/admin/solicitudes", titulo: "Solicitudes de vinculación", detalle: "Revisar y aprobar reclamos de perfiles", icono: LinkIcon, cuenta: stats.solicitudesPendientes, colorCuenta: "bg-amber-500/15 text-amber-500" },
    { href: "/admin/usuarios", titulo: "Usuarios y roles", detalle: "Asignar Organizador o Administrador", icono: ShieldCheck },
    { href: "/admin/mensajes", titulo: "Mensajes", detalle: "Lo que llega por /contacto", icono: Mail },
    { href: "/admin/auditoria", titulo: "Auditoría", detalle: "Historial de acciones administrativas", icono: ScrollText },
    { href: "/admin/errores", titulo: "Errores del sistema", detalle: "Errores no esperados de las APIs", icono: Shield, cuenta: stats.erroresRecientes, colorCuenta: "bg-red-500/15 text-red-500" },
  ];

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Panel de administración</h1>
          <p className="text-muted-foreground text-lg">Resumen y gestión de Regateando</p>
        </header>

        <section aria-label="Resumen" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {numeros.map((n) => {
            const Icono = n.icono;
            return (
              <div
                key={n.etiqueta}
                className={`rounded-2xl border bg-surface p-5 ${n.alerta ? "border-current/40 " + n.color : "border-border"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm ${n.alerta ? n.color : "text-muted-foreground"}`}>{n.etiqueta}</p>
                  <Icono className={`w-4 h-4 shrink-0 ${n.alerta ? n.color : "text-muted-foreground"}`} aria-hidden="true" />
                </div>
                <p className={`mt-2 text-4xl font-extrabold tracking-tight tabular-nums ${n.alerta ? n.color : "text-foreground"}`}>
                  {n.valor.toLocaleString("es-AR")}
                </p>
              </div>
            );
          })}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Acciones rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accesos.map((a) => {
              const Icono = a.icono;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-[transform,border-color,box-shadow] duration-200 ease-out-strong hover:-translate-y-1 active:scale-[0.985] hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icono className="w-5 h-5" aria-hidden="true" />
                    </span>
                    {a.cuenta ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${a.colorCuenta}`}>{a.cuenta}</span>
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <span className="block font-bold group-hover:text-primary transition-colors">{a.titulo}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{a.detalle}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
