# Respaldos de la base de datos

Todos los domingos a las 03:00 (Argentina) una tarea de GitHub Actions
(`.github/workflows/respaldo-base.yml`) saca una copia completa de la base de
Neon, comprueba que se puede restaurar y la guarda cifrada durante 90 días.

## Dónde están

En GitHub: repositorio `FranMaine/FAY` → pestaña **Actions** → tarea **Respaldo
semanal de la base** → entrar a una ejecución → sección **Artifacts** (al final):
`respaldo-orzando-AAAA-MM-DD`. Se conservan 90 días (unas 12 copias).

El repositorio es público, así que cada copia está cifrada con la clave
`BACKUP_PASSPHRASE`. **Sin esa clave no se puede abrir ninguna copia**: guardala
también fuera de GitHub (administrador de contraseñas).

## Configuración inicial (una sola vez)

En GitHub → Settings → Secrets and variables → Actions → New repository secret:

1. `BACKUP_DATABASE_URL`: conexión **directa** a Neon. En la consola de Neon,
   proyecto FAY-2 → Connect → desmarcar "Connection pooling" → copiar la URL
   (el host NO debe tener `-pooler`).
2. `BACKUP_PASSPHRASE`: una clave larga y aleatoria. Para generarla:
   `openssl rand -base64 32`

Después, para probar sin esperar al domingo: Actions → Respaldo semanal de la
base → **Run workflow**.

## Cómo restaurar

1. Descargar el artefacto desde Actions (es un .zip con un `.dump.gpg` adentro).
2. Descifrar (pide la clave `BACKUP_PASSPHRASE`):

   ```bash
   gpg --output orzando.dump --decrypt orzando-AAAA-MM-DD.dump.gpg
   ```

3. Restaurar en una base **vacía** (idealmente una rama o proyecto nuevo de
   Neon, para no pisar la actual hasta confirmar que está bien):

   ```bash
   pg_restore --no-owner --no-privileges --dbname="URL_DE_LA_BASE_NUEVA" orzando.dump
   ```

4. Para usarla en el sitio, cambiar `DATABASE_URL` en Vercel y volver a
   desplegar.

Para ver qué contiene una copia sin restaurarla: `pg_restore --list orzando.dump`.

## Qué incluye

Toda la base: regatistas, resultados, campeonatos, clubes, cuentas (con las
contraseñas ya convertidas en hash), favoritos, auditoría, etc. No incluye los
archivos de imágenes (logos y fotos), que están en Vercel Blob.
