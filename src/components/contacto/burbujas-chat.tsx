import { cn } from "@/lib/utils";

export interface EntradaChat {
  id: string;
  autor: "ADMIN" | "USUARIO";
  texto: string;
  createdAt: string;
}

// Mensajes de una conversación de /contacto en forma de chat: el mensaje
// inicial y las respuestas, las de quien mira a la derecha y las del otro a
// la izquierda. `yo` indica de qué lado está quien mira la pantalla.
export function BurbujasChat({
  inicial,
  entradas,
  yo,
  nombreUsuario,
}: {
  inicial: { texto: string; createdAt: string };
  entradas: EntradaChat[];
  yo: "ADMIN" | "USUARIO";
  nombreUsuario: string;
}) {
  const todos: EntradaChat[] = [{ id: "inicial", autor: "USUARIO", texto: inicial.texto, createdAt: inicial.createdAt }, ...entradas];
  return (
    <ol className="space-y-3">
      {todos.map((e) => {
        const mio = e.autor === yo;
        return (
          <li key={e.id} className={cn("flex", mio ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm space-y-1",
                mio ? "bg-primary text-white rounded-br-sm" : "bg-surface-hover text-foreground rounded-bl-sm border border-border"
              )}
            >
              <p className={cn("text-[11px] font-medium", mio ? "text-white/80" : "text-muted-foreground")}>
                {e.autor === "ADMIN" ? "Orzando" : nombreUsuario} · {new Date(e.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
              </p>
              <p className="whitespace-pre-wrap break-words">{e.texto}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
