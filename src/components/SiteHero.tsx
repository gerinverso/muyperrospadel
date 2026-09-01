import Image from "next/image";

/**
 * La foto del grupo. Va en `public/`, asi que se referencia por ruta y no con
 * un import estatico: si el archivo todavia no esta, la pagina compila igual y
 * el hero se ve como el panel de lineas de cancha que tiene detras.
 */
const GROUP_PHOTO = "/equipo.jpg";

/**
 * Portada de la home: la foto del grupo a sangre con el nombre del club encima.
 *
 * Las capas se apilan por orden en el DOM y no con `z-index`: los tres bloques
 * de fondo son `absolute` y el contenido es `relative`, asi que cae ultimo y
 * queda arriba sin tener que numerar nada.
 */
export default function SiteHero() {
  return (
    <section className="relative flex min-h-[440px] flex-col justify-end overflow-hidden border-b border-surface-bright md:min-h-[600px]">
      {/* Fondo de respaldo: si falta la foto el hero sigue teniendo textura en
          vez de quedar un rectangulo vacio. */}
      <div
        aria-hidden="true"
        className="court-lines absolute inset-0 bg-surface-container-low"
      />

      {/* object-[center_35%]: en una foto de grupo las caras estan arriba del
          centro, y abajo va el titulo. */}
      <Image
        src={GROUP_PHOTO}
        alt="Los jugadores de Muy Perros Pádel"
        fill
        priority
        sizes="(min-width: 1440px) 1440px, 100vw"
        className="object-cover object-[center_35%]"
      />

      {/* Dos capas en un solo div: el color de fondo al 40% oscurece la foto
          entera (piso de contraste para el título, sea cual sea la foto) y el
          degradado encima la cierra del todo abajo, donde va el texto. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background/40 bg-gradient-to-t from-background from-10% via-background/75 to-transparent"
      />

      <div className="relative px-margin-mobile pb-space-lg pt-space-xl md:px-margin-desktop md:pb-space-xl">
        <p className="flex flex-wrap items-center gap-space-xs">
          <span aria-hidden="true" className="h-2 w-2 bg-primary-fixed" />
          <span className="font-label-caps text-label-caps text-primary-fixed">
            Torneos entre amigos
          </span>
        </p>

        {/* El h1 de la portada. Las tres lineas son `span`s en bloque y no
            saltos forzados: el texto sigue siendo "Muy Perros Pádel" para un
            lector de pantalla, y las mayusculas las pone el CSS. */}
        <h1 className="font-display-lg mt-space-md text-[clamp(3.25rem,15vw,9.5rem)] font-black uppercase leading-[0.82] tracking-[-0.04em] text-on-surface">
          <span className="block">Muy</span>
          <span className="block">Perros</span>
          <span className="block text-primary-fixed">Pádel</span>
        </h1>

        <p className="font-body-lg text-body-lg mt-space-md max-w-[52ch] text-on-surface-variant">
          El grupo que se junta a jugar torneos. Parejas sorteadas, cuadro hasta
          la final, y un ranking que arranca de cero cada temporada.
        </p>
      </div>
    </section>
  );
}
