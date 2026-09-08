import crypto from 'crypto';

// Tokens de un solo uso (recuperación de contraseña, etc). Nunca guardamos
// el token en texto plano en la base -si alguien llegara a leer la tabla
// (un dump, una consulta de otro admin) no debería poder usar ese valor
// para resetear la contraseña de nadie. Se manda el token crudo por mail y
// se guarda solo su hash; al validar, se hashea el token recibido y se
// compara contra lo guardado.

export function generarToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
