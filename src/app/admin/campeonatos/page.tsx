"use client";

import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, EditIcon, EyeIcon, Loader2Icon, ChevronRightIcon, SailboatIcon, ImageIcon, SendIcon, UndoIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { NuevoCampeonatoModal } from "@/components/admin/nuevo-campeonato-modal";
import { SubirLogoModal } from "@/components/admin/subir-logo-modal";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Modal } from "@/components/ui/modal";
import { mensajeDeError, cn } from "@/lib/utils";
import { toast } from "sonner";
import { ClaseIcon } from "@/components/icons/clase-icons";

interface Campeonato {
  id: string;
  nombre: string;
  evento?: string | null;
  anio: number;
  estado: "BORRADOR" | "PUBLICADO";
  clase: { id: string; nombre: string };
  logoUrl?: string | null;
}

interface Clase {
  id: string;
  nombre: string;
}

interface ClubOption {
  id: string;
  nombre: string;
}

// Un mismo evento (ej: "Vela Fest 2026") carga una fila por clase -antes
// se veían todas sueltas en una lista plana sin ninguna agrupación
// visual, mezcladas con el resto de los campeonatos del sistema. Agrupar
// por nombre+año (misma clave que ya usa scripts/audit-db.ts para
// detectar duplicados) las junta como "carpeta" del evento, con sus
// categorías adentro.
function agruparPorEvento(campeonatos: Campeonato[]) {
  const grupos = new Map<string, { nombre: string; anio: number; items: Campeonato[] }>();
  for (const c of campeonatos) {
    const nombreGrupo = c.evento?.trim() || c.nombre;
    const clave = `${nombreGrupo.toLowerCase()}__${c.anio}`;
    if (!grupos.has(clave)) grupos.set(clave, { nombre: nombreGrupo, anio: c.anio, items: [] });
    grupos.get(clave)!.items.push(c);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, logoUrl: g.items.find((c) => c.logoUrl)?.logoUrl ?? null }))
    .sort((a, b) => b.anio - a.anio || a.nombre.localeCompare(b.nombre));
}

export default function AdminCampeonatosPage() {
  const router = useRouter();
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [clubes, setClubes] = useState<ClubOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publicandoId, setPublicandoId] = useState<string | null>(null);
  // Carpetas abiertas -por defecto todas cerradas, así la vista inicial
  // es una lista corta de eventos en vez de la lista larga de siempre.
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  // Subir/quitar el logo de un evento directo desde esta lista, sin tener
  // que entrar a cada campeonato individual -se aplica a TODOS los
  // campeonatos del grupo, así queda consistente sin importar cuál se
  // termine mostrando (ver logoUrl derivado en agruparPorEvento).
  const [subiendoLogoGrupo, setSubiendoLogoGrupo] = useState<string | null>(null);
  const [errorLogoGrupo, setErrorLogoGrupo] = useState<{ clave: string; mensaje: string } | null>(null);
  const logoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Qué evento (clave) y qué archivo está esperando confirmación en el
  // SubirLogoModal -null = modal cerrado. Se guardan juntos porque el
  // modal es uno solo compartido por todas las filas de la tabla.
  const [logoGrupoPendiente, setLogoGrupoPendiente] = useState<{ clave: string; ids: string[]; file: File } | null>(null);

  // Publicar de un saque todos los campeonatos en borrador de un evento -sin
  // esto había que abrir uno por uno y tocar "Publicar" en cada categoría.
  const [publicandoEventoClave, setPublicandoEventoClave] = useState<string | null>(null);

  // "Personalizar evento": aplica nombre del evento, año, sede, fechas y/o
  // descartes a TODOS los campeonatos del evento en un solo guardado, en
  // vez de repetir la misma edición en cada categoría -mismo criterio que
  // ya existe para el logo del grupo (subirLogoDelGrupo). Ojo: esto es el
  // campo `evento` (la etiqueta del grupo), no el `nombre` de cada
  // categoría individual -un evento puede seguir teniendo categorías con
  // nombres distintos (ver comentario en agruparPorEvento), eso no se
  // toca acá.
  const [personalizarClave, setPersonalizarClave] = useState<string | null>(null);
  // Nombre del evento y año son conceptos del GRUPO entero (no de una
  // categoría puntual) -se precargan con el valor actual y se mandan
  // siempre, a diferencia de sede/descartes/fechas (que sí pueden variar
  // categoría por categoría, así que vacío = "no tocar este campo").
  const [nombreEventoPersonalizar, setNombreEventoPersonalizar] = useState("");
  const [anioPersonalizar, setAnioPersonalizar] = useState("");
  const [sedeIdPersonalizar, setSedeIdPersonalizar] = useState("");
  const [descartesPersonalizar, setDescartesPersonalizar] = useState("");
  const [fechaInicioPersonalizar, setFechaInicioPersonalizar] = useState("");
  const [fechaFinPersonalizar, setFechaFinPersonalizar] = useState("");
  const [guardandoPersonalizar, setGuardandoPersonalizar] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [campeonatosRes, clasesRes, clubesRes] = await Promise.all([
        fetch("/api/campeonatos"),
        fetch("/api/clases"),
        fetch("/api/clubes"),
      ]);
      setCampeonatos(await campeonatosRes.json());
      setClases(await clasesRes.json());
      setClubes(await clubesRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const grupos = useMemo(() => agruparPorEvento(campeonatos), [campeonatos]);

  function toggle(clave: string) {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  }

  const subirLogoDelGrupo = async (clave: string, ids: string[], file: File, quitarFondo: boolean) => {
    setSubiendoLogoGrupo(clave);
    setErrorLogoGrupo(null);
    try {
      const resultados = await Promise.all(
        ids.map(async (id) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("quitarFondo", String(quitarFondo));
          const res = await fetch(`/api/admin/campeonatos/${id}/logo`, { method: "PATCH", body: formData });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "No se pudo subir el logo");
          return { id, logoUrl: data.logoUrl as string };
        })
      );
      const logoPorId = new Map(resultados.map((r) => [r.id, r.logoUrl]));
      setCampeonatos((prev) => prev.map((c) => (logoPorId.has(c.id) ? { ...c, logoUrl: logoPorId.get(c.id)! } : c)));
      setLogoGrupoPendiente(null);
    } catch (err) {
      setErrorLogoGrupo({ clave, mensaje: mensajeDeError(err) });
    } finally {
      setSubiendoLogoGrupo(null);
    }
  };

  const handlePublicar = async (c: Campeonato) => {
    // Mismo PATCH que ya usa /admin/campeonatos/[id] (ver handlePublicar
    // ahí) -acá evita tener que entrar a cada campeonato solo para
    // publicarlo o volverlo a borrador.
    const nuevoEstado = c.estado === "PUBLICADO" ? "BORRADOR" : "PUBLICADO";
    setPublicandoId(c.id);
    try {
      const res = await fetch(`/api/campeonatos/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar el estado");
      setCampeonatos((prev) => prev.map((x) => (x.id === c.id ? { ...x, estado: data.estado } : x)));
      toast.success(nuevoEstado === "PUBLICADO" ? "Campeonato publicado" : "Campeonato vuelto a borrador");
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setPublicandoId(null);
    }
  };

  const handlePublicarEvento = async (clave: string, items: Campeonato[]) => {
    const pendientes = items.filter((c) => c.estado !== "PUBLICADO");
    if (pendientes.length === 0) {
      toast.message("Ya está todo publicado en este evento");
      return;
    }
    setPublicandoEventoClave(clave);
    try {
      const resultados = await Promise.allSettled(
        pendientes.map((c) =>
          fetch(`/api/campeonatos/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "PUBLICADO" }),
          }).then(async (res) => {
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "No se pudo publicar");
            return c.id;
          })
        )
      );
      const publicados = new Set(
        resultados.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value)
      );
      const fallidos = resultados.length - publicados.size;
      if (publicados.size > 0) {
        setCampeonatos((prev) => prev.map((x) => (publicados.has(x.id) ? { ...x, estado: "PUBLICADO" } : x)));
      }
      if (fallidos === 0) {
        toast.success(publicados.size === 1 ? "Categoría publicada" : `${publicados.size} categorías publicadas`);
      } else {
        toast.error(`Se publicaron ${publicados.size} de ${pendientes.length} -revisá las que fallaron`);
      }
    } finally {
      setPublicandoEventoClave(null);
    }
  };

  function abrirPersonalizar(clave: string, grupo: { nombre: string; anio: number }) {
    setNombreEventoPersonalizar(grupo.nombre);
    setAnioPersonalizar(String(grupo.anio));
    setSedeIdPersonalizar("");
    setDescartesPersonalizar("");
    setFechaInicioPersonalizar("");
    setFechaFinPersonalizar("");
    setPersonalizarClave(clave);
  }

  const handleGuardarPersonalizar = async (items: Campeonato[]) => {
    const nombreEvento = nombreEventoPersonalizar.trim();
    if (nombreEvento.length < 3) {
      toast.error("El nombre del evento tiene que tener al menos 3 caracteres");
      return;
    }
    const anio = parseInt(anioPersonalizar, 10);
    if (Number.isNaN(anio) || anio < 2000 || anio > 2100) {
      toast.error("El año no es válido");
      return;
    }
    // Vacío = "no tocar este campo" para sede/descartes/fechas -son datos
    // que sí pueden variar categoría por categoría, así que solo se manda
    // al PATCH lo que el admin efectivamente completó. Nombre y año del
    // evento, en cambio, se mandan siempre (son del grupo entero, no de
    // una categoría puntual).
    const body: { evento: string; anio: number; sedeId?: string | null; descartes?: number; fechaInicio?: string | null; fechaFin?: string | null } = {
      evento: nombreEvento,
      anio,
    };
    if (sedeIdPersonalizar !== "") body.sedeId = sedeIdPersonalizar === "NINGUNA" ? null : sedeIdPersonalizar;
    if (descartesPersonalizar.trim() !== "") {
      const n = parseInt(descartesPersonalizar, 10);
      if (Number.isNaN(n) || n < 0) {
        toast.error("Descartes tiene que ser un número mayor o igual a 0");
        return;
      }
      body.descartes = n;
    }
    if (fechaInicioPersonalizar !== "") body.fechaInicio = fechaInicioPersonalizar;
    if (fechaFinPersonalizar !== "") body.fechaFin = fechaFinPersonalizar;
    setGuardandoPersonalizar(true);
    try {
      const resultados = await Promise.allSettled(
        items.map((c) =>
          fetch(`/api/campeonatos/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }).then(async (res) => {
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "No se pudo actualizar");
            return res.json();
          })
        )
      );
      const fallidos = resultados.filter((r) => r.status === "rejected").length;
      await fetchData();
      if (fallidos === 0) {
        toast.success("Evento actualizado");
        setPersonalizarClave(null);
      } else {
        toast.error(`Se aplicó a ${items.length - fallidos} de ${items.length} categorías -revisá las que fallaron`);
      }
    } finally {
      setGuardandoPersonalizar(false);
    }
  };

  const handleEliminar = async (c: Campeonato) => {
    // La confirmación ahora la maneja ConfirmDeleteButton (in-place, no un
    // window.confirm nativo) -acá ya llega confirmado.
    setDeletingId(c.id);
    try {
      const res = await fetch(`/api/campeonatos/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar el campeonato");
      }
      await fetchData();
      toast.success("Campeonato eliminado");
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setDeletingId(null);
    }
  };

  function botonPublicar(c: Campeonato) {
    const publicando = publicandoId === c.id;
    const esPublicado = c.estado === "PUBLICADO";
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={esPublicado ? "Volver a borrador" : "Publicar campeonato"}
        title={esPublicado ? "Volver a borrador" : "Publicar"}
        disabled={publicando}
        onClick={() => handlePublicar(c)}
        className={cn(
          "h-8 w-8",
          esPublicado ? "text-muted-foreground hover:text-amber-500" : "text-muted-foreground hover:text-green-500"
        )}
      >
        {publicando ? (
          <Loader2Icon className="w-4 h-4 animate-spin" />
        ) : esPublicado ? (
          <UndoIcon className="w-4 h-4" />
        ) : (
          <SendIcon className="w-4 h-4" />
        )}
      </Button>
    );
  }

  function filaClase(c: Campeonato) {
    return (
      <tr key={c.id} className="hover:bg-background/50 transition-colors">
        <td className="px-6 py-3 pl-14">
          <span className="flex items-center gap-2">
            {c.clase && <ClaseIcon nombreClase={c.clase.nombre} className="w-6 h-6 shrink-0 object-contain" />}
            {c.clase?.nombre}
          </span>
        </td>
        <td className="px-6 py-3">
          <Badge variant={c.estado === "PUBLICADO" ? "default" : "muted"} className={
            c.estado === "PUBLICADO" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
          }>
            {c.estado}
          </Badge>
        </td>
        <td className="px-6 py-3 text-right space-x-2">
          {botonPublicar(c)}
          <Link href={`/admin/campeonatos/${c.id}`}>
            <Button variant="ghost" size="icon" aria-label="Ver campeonato" className="h-8 w-8 text-muted-foreground hover:text-primary">
              <EyeIcon className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/admin/campeonatos/${c.id}`}>
            <Button variant="ghost" size="icon" aria-label="Editar campeonato" className="h-8 w-8 text-muted-foreground hover:text-accent">
              <EditIcon className="w-4 h-4" />
            </Button>
          </Link>
          <ConfirmDeleteButton
            label={`Eliminar "${c.nombre}" (${c.clase?.nombre})`}
            disabled={deletingId === c.id}
            onConfirm={() => handleEliminar(c)}
          />
        </td>
      </tr>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Gestión de Campeonatos</h1>
            <p className="text-muted-foreground text-lg">Administrá los campeonatos del sistema, agrupados por evento</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="w-4 h-4" /> Nuevo Campeonato
          </Button>
        </header>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Evento / Clase</th>
                  <th scope="col" className="px-6 py-4 font-medium">Estado</th>
                  <th scope="col" className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center">
                      <Loader2Icon className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : grupos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                      Todavía no hay campeonatos cargados.
                    </td>
                  </tr>
                ) : (
                  grupos.map((grupo) => {
                    const clave = `${grupo.nombre.trim().toLowerCase()}__${grupo.anio}`;
                    // Un evento con una sola clase no necesita el gesto de
                    // "abrir la carpeta" -se muestra directo, como una fila
                    // normal, con la clase al lado del nombre.
                    if (grupo.items.length === 1) {
                      const c = grupo.items[0];
                      return (
                        <tr key={clave} className="hover:bg-background/50 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              {c.nombre} <span className="text-muted-foreground font-normal">{grupo.anio}</span>
                              <span className="text-muted-foreground mx-1">·</span>
                              {c.clase && <ClaseIcon nombreClase={c.clase.nombre} className="w-5 h-5 shrink-0 object-contain" />}
                              <span className="text-muted-foreground font-normal">{c.clase?.nombre}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={c.estado === "PUBLICADO" ? "default" : "muted"} className={
                              c.estado === "PUBLICADO" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                            }>
                              {c.estado}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {botonPublicar(c)}
                            <Link href={`/admin/campeonatos/${c.id}`}>
                              <Button variant="ghost" size="icon" aria-label="Ver campeonato" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/admin/campeonatos/${c.id}`}>
                              <Button variant="ghost" size="icon" aria-label="Editar campeonato" className="h-8 w-8 text-muted-foreground hover:text-accent">
                                <EditIcon className="w-4 h-4" />
                              </Button>
                            </Link>
                            <ConfirmDeleteButton
                              label={`Eliminar "${c.nombre}"`}
                              disabled={deletingId === c.id}
                              onConfirm={() => handleEliminar(c)}
                            />
                          </td>
                        </tr>
                      );
                    }

                    const abierta = abiertas.has(clave);
                    return (
                      <Fragment key={clave}>
                        <tr
                          className="hover:bg-background/50 transition-colors cursor-pointer"
                          onClick={() => toggle(clave)}
                        >
                          <td className="px-6 py-4 font-semibold" colSpan={2}>
                            <div className="flex items-center gap-2">
                              <ChevronRightIcon className={cn("w-4 h-4 text-muted-foreground transition-transform", abierta && "rotate-90")} />
                              {grupo.logoUrl ? (
                                <Image src={grupo.logoUrl} alt="" width={32} height={32} className="h-4 w-4 object-contain" />
                              ) : (
                                <SailboatIcon className="w-4 h-4 text-primary" />
                              )}
                              {grupo.nombre} <span className="text-muted-foreground font-normal">{grupo.anio}</span>
                              <span className="text-muted-foreground font-normal text-xs">
                                ({grupo.items.length} categorías)
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={(el) => { logoInputRefs.current[clave] = el; }}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/avif"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setLogoGrupoPendiente({ clave, ids: grupo.items.map((c) => c.id), file });
                                e.target.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-green-500"
                              aria-label="Publicar todas las categorías pendientes del evento"
                              title="Publicar evento"
                              disabled={publicandoEventoClave === clave}
                              onClick={() => handlePublicarEvento(clave, grupo.items)}
                            >
                              {publicandoEventoClave === clave ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              aria-label="Personalizar evento (nombre, año, sede, fechas y descartes para todas las categorías)"
                              title="Personalizar evento"
                              onClick={() => abrirPersonalizar(clave, grupo)}
                            >
                              <SettingsIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              aria-label={grupo.logoUrl ? "Reemplazar logo del evento" : "Subir logo del evento"}
                              disabled={subiendoLogoGrupo === clave}
                              onClick={() => logoInputRefs.current[clave]?.click()}
                            >
                              {subiendoLogoGrupo === clave ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            </Button>
                          </td>
                        </tr>
                        {errorLogoGrupo?.clave === clave && (
                          <tr>
                            <td colSpan={3} className="px-6 pb-2">
                              <p role="alert" className="text-xs text-red-500">{errorLogoGrupo.mensaje}</p>
                            </td>
                          </tr>
                        )}
                        {abierta && grupo.items.map((c) => filaClase(c))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NuevoCampeonatoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        // Redirigimos directo a la página de edición del campeonato recién
        // creado -antes había que cerrar el modal y buscarlo a mano en la
        // tabla para poder cargarle las regatas y resultados.
        onCreated={(campeonato) => router.push(`/admin/campeonatos/${campeonato.id}`)}
        clases={clases}
        clubes={clubes}
        eventos={[...new Set(campeonatos.map((c) => c.evento?.trim() || c.nombre))].sort()}
      />

      <SubirLogoModal
        key={logoGrupoPendiente ? `${logoGrupoPendiente.clave}-${logoGrupoPendiente.file.name}-${logoGrupoPendiente.file.lastModified}` : "sin-archivo"}
        file={logoGrupoPendiente?.file ?? null}
        onClose={() => setLogoGrupoPendiente(null)}
        onConfirm={(quitarFondo) => {
          if (logoGrupoPendiente) return subirLogoDelGrupo(logoGrupoPendiente.clave, logoGrupoPendiente.ids, logoGrupoPendiente.file, quitarFondo);
        }}
        titulo="Subir logo del evento"
      />

      {(() => {
        const grupo = grupos.find((g) => `${g.nombre.trim().toLowerCase()}__${g.anio}` === personalizarClave);
        if (!grupo) return null;
        const campoInput = "w-full h-11 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground";
        return (
          <Modal isOpen={!!personalizarClave} onClose={() => !guardandoPersonalizar && setPersonalizarClave(null)} className="w-full max-w-md">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Personalizar evento</h2>
                <p className="text-sm text-muted-foreground">
                  Se aplica a las {grupo.items.length} categorías de &quot;{grupo.nombre}&quot; {grupo.anio}. Nombre y
                  año se aplican siempre; dejá el resto vacío para no tocarlo.
                </p>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="personalizar-nombre" className="text-sm font-medium text-muted-foreground">Nombre del evento</label>
                  <input
                    id="personalizar-nombre"
                    type="text"
                    className={campoInput}
                    value={nombreEventoPersonalizar}
                    onChange={(e) => setNombreEventoPersonalizar(e.target.value)}
                  />
                </div>
                <div className="w-24 space-y-1.5">
                  <label htmlFor="personalizar-anio" className="text-sm font-medium text-muted-foreground">Año</label>
                  <input
                    id="personalizar-anio"
                    type="number"
                    className={campoInput}
                    value={anioPersonalizar}
                    onChange={(e) => setAnioPersonalizar(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="personalizar-fecha-inicio" className="text-sm font-medium text-muted-foreground">Fecha inicio</label>
                  <input
                    id="personalizar-fecha-inicio"
                    type="date"
                    placeholder="No cambiar"
                    className={campoInput}
                    value={fechaInicioPersonalizar}
                    onChange={(e) => setFechaInicioPersonalizar(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="personalizar-fecha-fin" className="text-sm font-medium text-muted-foreground">Fecha fin</label>
                  <input
                    id="personalizar-fecha-fin"
                    type="date"
                    placeholder="No cambiar"
                    className={campoInput}
                    value={fechaFinPersonalizar}
                    onChange={(e) => setFechaFinPersonalizar(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="personalizar-sede" className="text-sm font-medium text-muted-foreground">Sede</label>
                <select
                  id="personalizar-sede"
                  className={campoInput}
                  value={sedeIdPersonalizar}
                  onChange={(e) => setSedeIdPersonalizar(e.target.value)}
                >
                  <option value="">No cambiar</option>
                  <option value="NINGUNA">Sin sede</option>
                  {clubes.map((club) => (
                    <option key={club.id} value={club.id}>{club.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="personalizar-descartes" className="text-sm font-medium text-muted-foreground">Descartes</label>
                <input
                  id="personalizar-descartes"
                  type="number"
                  min={0}
                  placeholder="No cambiar"
                  className={campoInput}
                  value={descartesPersonalizar}
                  onChange={(e) => setDescartesPersonalizar(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPersonalizarClave(null)} disabled={guardandoPersonalizar}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => handleGuardarPersonalizar(grupo.items)} disabled={guardandoPersonalizar}>
                  {guardandoPersonalizar ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Aplicar a todo el evento"}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </main>
  );
}
