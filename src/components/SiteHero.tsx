import Image from "next/image";

/**
 * La foto del grupo. Va en `public/`, asi que se referencia por ruta y no con
 * un import estatico: si el archivo todavia no esta, la pagina compila igual y
 * la franja se ve como el panel de lineas de cancha que tiene detras.
 */
const GROUP_PHOTO = "/equipo.jpg";

/**
 * Portada de la home: la foto del grupo en una franja a sangre y, debajo, el
 * nombre del club.
 *
 * El titulo va debajo y no encima de la foto a proposito. Es una foto de doce
 * personas en fila: un titular del tamaño que pide una portada les taparia las
 * caras justo en la banda donde estan. El degradado del pie disuelve la foto en
 * el fondo, asi que las dos partes se leen como un solo bloque.
 */
export default function SiteHero() {
  return (
    <section className="border-b border-surface-bright">
      <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[2/1] lg:aspect-[8/3]">
        {/* Fondo de respaldo: si falta la foto la franja sigue teniendo textura
            en vez de quedar un rectangulo vacio. */}
        <div
          aria-hidden="true"
          className="court-lines absolute inset-0 bg-surface-container-low"
        />

        {/* object-[center_30%]: el recorte se ancla arriba del centro, que es
            donde estan las caras. Si en una foto nueva quedan mas abajo, este
            es el numero a mover. */}
        <Image
          src={GROUP_PHOTO}
          alt="Los jugadores de Muy Perros Pádel en la cancha"
          fill
          priority
          sizes="(min-width: 1440px) 1440px, 100vw"
          className="object-cover object-[center_30%]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background from-0% to-transparent to-45%"
        />
      </div>

      <div className="px-margin-mobile pb-space-lg md:px-margin-desktop">
        <p className="flex flex-wrap items-center gap-space-xs">
          <span aria-hidden="true" className="h-2 w-2 bg-primary-fixed" />
          <span className="font-label-caps text-label-caps text-primary-fixed">
            Torneos entre amigos
          </span>
        </p>

        {/* El h1 de la pagina. El salto de linea lo decide el ancho: en mobile
            "Pádel" cae solo abajo, en desktop entra todo en una linea. */}
        <h1 className="font-display-lg mt-space-md text-[clamp(2.75rem,9.5vw,8.5rem)] font-black uppercase leading-[0.85] tracking-[-0.04em] text-on-surface">
          Muy Perros <span className="text-primary-fixed">Pádel</span>
        </h1>

        <p className="font-body-lg text-body-lg mt-space-md max-w-[52ch] text-on-surface-variant">
          El grupo que se junta a jugar torneos. Parejas sorteadas, cuadro hasta
          la final, y un ranking que arranca de cero cada temporada.
        </p>
      </div>
    </section>
  );
}
