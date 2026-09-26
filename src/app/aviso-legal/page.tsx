import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Aviso legal de Regateando: titularidad, condiciones de uso y propiedad intelectual del sitio.",
};

// Contenido genérico de referencia -las partes marcadas [entre corchetes]
// son datos institucionales concretos del titular (razón social/CUIT
// exactos, domicilio legal, canal de contacto oficial) que hay que
// completar con el dato real antes de considerar esta página definitiva;
// no se puede inventar un CUIT o domicilio.
export default function AvisoLegalPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Aviso legal</h1>
          <p className="text-sm text-muted-foreground">Última actualización: septiembre de 2026</p>
        </header>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">1. Titularidad del sitio</h2>
          <p>
            Regateando es un sitio operado por [completar: razón social y CUIT
            exactos], con domicilio en
            [completar domicilio legal], República Argentina.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">2. Objeto del sitio</h2>
          <p>
            Regateando publica resultados oficiales, clasificaciones, rankings y
            estadísticas de regatas de vela correspondientes a campeonatos
            organizados por clubes y asociaciones de vela. La
            información se carga a partir de los resultados provistos por cada
            regata; ante cualquier discrepancia con el resultado oficial de un
            campeonato, prevalece este último.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">3. Condiciones de uso</h2>
          <p>
            El acceso y consulta del contenido público de este sitio es libre y
            gratuito. La creación de una cuenta y la vinculación de una cuenta a
            un perfil de regatista están sujetas a la veracidad de los datos
            aportados por el usuario; Regateando se reserva el derecho de rechazar o
            dar de baja una cuenta o una vinculación cuando existan indicios de
            uso indebido o de datos falsos.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">4. Propiedad intelectual</h2>
          <p>
            Los logotipos de clases y asociaciones de vela que se muestran en
            el sitio pertenecen a sus respectivos titulares y se utilizan
            únicamente con fines identificatorios de cada categoría, sin que
            ello implique afiliación, patrocinio o respaldo por parte de esas
            asociaciones. El resto del contenido propio del sitio (marca
            &quot;Regateando&quot;, diseño, textos) pertenece a su titular
            (ver punto 1).
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">5. Exactitud de la información</h2>
          <p>
            Regateando realiza sus mejores esfuerzos para que los resultados publicados
            sean fieles a los resultados oficiales de cada regata, pero no
            garantiza la ausencia total de errores u omisiones derivados de la
            carga de datos. Cualquier error detectado puede reportarse para su
            corrección.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">6. Legislación aplicable</h2>
          <p>
            Este aviso legal se rige por las leyes de la República Argentina.
            Para cualquier controversia derivada del uso del sitio, las partes
            se someten a los tribunales ordinarios competentes de la Ciudad
            Autónoma de Buenos Aires, con renuncia a cualquier otro fuero que
            pudiera corresponder.
          </p>
        </section>

        <section className="space-y-3 text-foreground/90">
          <h2 className="text-xl font-semibold">7. Contacto</h2>
          <p>
            Para consultas relacionadas con este aviso legal, comunicate a
            través de la página de contacto del sitio.
          </p>
        </section>
      </div>
    </main>
  );
}
