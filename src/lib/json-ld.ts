/**
 * JSON.stringify() no escapa la secuencia "</script>" -si algún día el
 * JSON-LD incluye un string con esos caracteres (nombre de club o de
 * regatista, por ejemplo) dentro de un <script dangerouslySetInnerHTML>,
 * cerraría el tag antes de tiempo y lo que venga después se renderizaría
 * como HTML de la página en vez de quedar dentro del script. Reemplazar
 * "<" por su escape unicode rompe esa secuencia sin cambiar el JSON en sí
 * (JSON.parse la interpreta igual).
 */
export function jsonLdSeguro(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
