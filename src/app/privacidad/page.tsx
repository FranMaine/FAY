import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos personales recolecta FAY Stats, para qué los usa y cómo ejercer tus derechos sobre ellos.",
};

// Redactada según lo que el sistema efectivamente hace hoy (ver
// prisma/schema.prisma: User, Regatista, SolicitudVinculacion) -no incluye
// nada que el sitio no recolecte de verdad (no hay analytics ni
// publicidad de terceros cargados en el código a la fecha de este
// aviso; si en el futuro se agrega alguno, esta página debe actualizarse
// para reflejarlo).
export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Política de privacidad</h1>
          <p className="text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long" })}</p>
        </header>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">1. Qué datos recolectamos</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Cuenta de usuario:</strong> nombre, email y contraseña (guardada encriptada, nunca en texto plano) cuando te registrás, o nombre/email/foto de perfil que provee Google si iniciás sesión con esa opción.</li>
            <li><strong>Vinculación con tu perfil de regatista:</strong> si pedís vincular tu cuenta a una ficha de regatista, guardamos esa solicitud y, si se aprueba, la relación entre tu cuenta y esa ficha.</li>
            <li><strong>Resultados deportivos:</strong> nombre, club y resultados de regata de cada regatista, provenientes de los resultados oficiales de cada campeonato -no de un formulario que vos completás.</li>
            <li><strong>Datos técnicos básicos:</strong> dirección IP en las solicitudes al servidor, usada únicamente para seguridad (por ejemplo, limitar intentos de inicio de sesión o de registro) y no para rastrear tu actividad de navegación.</li>
          </ul>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">2. Para qué usamos tus datos</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Crear y mantener tu cuenta, y permitirte iniciar sesión.</li>
            <li>Mostrar públicamente los resultados oficiales de regatas (nombre del regatista, club, resultados) -esto es el propósito central del sitio.</li>
            <li>Procesar tu solicitud de vinculación entre tu cuenta y tu perfil de regatista.</li>
            <li>Enviarte el email de verificación de cuenta o de recuperación de contraseña cuando lo pedís.</li>
            <li>Prevenir abuso (cuentas falsas, fuerza bruta sobre el login, spam en los formularios).</li>
          </ul>
          <p>No usamos tus datos con fines publicitarios ni los vendemos ni compartimos con terceros ajenos a la operación del sitio.</p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">3. Con quién compartimos datos</h2>
          <p>
            Los datos de resultados deportivos (nombre, club, resultados) son
            públicos por naturaleza del sitio: cualquier visitante puede
            verlos. Los datos de tu cuenta (email, contraseña) no se muestran
            públicamente. Usamos proveedores externos únicamente como
            infraestructura del servicio: hosting de la aplicación, base de
            datos, envío de emails transaccionales (verificación, recuperación
            de contraseña) e inicio de sesión con Google -estos proveedores
            procesan los datos por nuestra cuenta, no para uso propio.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">4. Cuánto tiempo conservamos los datos</h2>
          <p>
            Los datos de cuenta se conservan mientras la cuenta esté activa.
            Los resultados deportivos se conservan como parte del historial
            oficial de resultados de la FAY, sin plazo de baja automática, dado
            su valor como registro histórico.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">5. Tus derechos</h2>
          <p>
            De acuerdo con la Ley 25.326 de Protección de Datos Personales,
            podés ejercer tus derechos de acceso, rectificación, actualización
            y supresión de tus datos personales de cuenta. Si tu ficha de
            regatista tiene un dato incorrecto (nombre mal cargado, club
            equivocado), también podés pedir su corrección. Para ejercer
            cualquiera de estos derechos, contactate a través de los canales
            oficiales de la Federación Argentina de Yachting.
          </p>
          <p className="text-sm text-muted-foreground">
            La Agencia de Acceso a la Información Pública, en su carácter de
            Órgano de Control de la Ley 25.326, tiene la atribución de
            atender las denuncias y reclamos que se interpongan con relación
            al incumplimiento de las normas sobre protección de datos
            personales.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">6. Seguridad</h2>
          <p>
            Las contraseñas se almacenan encriptadas (nunca en texto plano), el
            sitio se sirve siempre bajo HTTPS, y aplicamos límites de intentos
            en el login y en los formularios de registro/recuperación de
            contraseña para reducir el riesgo de acceso indebido.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">7. Cookies</h2>
          <p>
            Ver el detalle en nuestro{" "}
            <a href="/cookies" className="text-primary hover:underline font-medium">
              aviso de cookies
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
