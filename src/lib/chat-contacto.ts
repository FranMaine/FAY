import { randomBytes } from 'node:crypto';
import { SITE_URL } from '@/lib/site';

// Token privado de una conversación de /contacto: va en el link que le llega
// por mail y es lo único que da acceso a verla y contestar sin tener cuenta,
// por eso es largo y aleatorio (192 bits), no un id adivinable.
export function nuevoTokenChat(): string {
  return randomBytes(24).toString('hex');
}

export function urlChat(token: string): string {
  return `${SITE_URL}/contacto/chat/${token}`;
}

export const TEXTO_CHAT_MAX = 4000;
