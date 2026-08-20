import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { countdownLabel } from "@/lib/countdown";

function formatStartDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

/**
 * Hero de la home: anuncia el proximo torneo con inscripciones abiertas.
 *
 * Se elige el que arranca antes. Los que todavia no tienen fecha van ultimos y
 * se anuncian sin cuenta regresiva: la fecha es opcional y no tiene por que
 * esconder el anuncio.
 *
 * Si no hay ninguno devuelve null y la home queda como estaba.
 */
export default async function TournamentHero() {
  const tournament = await prisma.tournament.findFirst({
    where: { registrationOpen: true, status: "SETUP" },
    orderBy: { startsAt: { sort: "asc", nulls: "last" } },
    select: {
      id: true,
      name: true,
      startsAt: true,
      registrationFee: true,
      _count: { select: { players: true } },
    },
  });

  if (!tournament) return null;

  const countdown = countdownLabel(tournament.startsAt, new Date());
  const players = tournament._count.players;
  const fee = tournament.registrationFee
    ? `$${Number(tournament.registrationFee).toFixed(0)}`
    : null;

  return (
    <section className="neon-glow relative isolate mb-space-lg overflow-hidden rounded-lg border border-primary-fixed/40 bg-surface-container">
      {/* El logo del club como escudo del anuncio: entero y reconocible, no un
          recorte al azar. El jpg tiene fondo claro solido, asi que sin mascara
          se veria como un rectangulo gris pegado encima; el degradado radial lo
          disuelve por los cuatro lados y lo deja flotando. */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex w-full items-center justify-center md:w-1/2 md:justify-end"
        aria-hidden="true"
      >
        {/* Ampliado a proposito: recorta el texto del logo y deja en cuadro solo
            la ilustracion, que es lo reconocible y no compite con la tipografia. */}
        <div className="relative aspect-square h-[185%]">
          <Image
            src="/logo.jpg"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-contain opacity-[0.10] [-webkit-mask-image:radial-gradient(closest-side,#000_45%,transparent_92%)] [mask-image:radial-gradient(closest-side,#000_45%,transparent_92%)] md:opacity-40"
          />
        </div>
      </div>

      {/* Velo que asegura la lectura del texto: vertical en mobile (el logo
          queda detras) y horizontal en desktop (queda al lado). */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-surface-container via-surface-container/85 to-surface-container/50 md:bg-gradient-to-r md:via-surface-container/80 md:to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-space-md p-space-md md:max-w-[70%] md:p-space-lg">
        <div className="flex flex-wrap items-center gap-space-sm">
          <p className="font-label-caps text-label-caps text-primary-fixed">
            NUEVO TORNEO · INSCRIPCIÓN ABIERTA
          </p>
          {countdown && (
            <span className="font-label-caps text-label-caps rounded border border-primary-fixed bg-primary-fixed/10 px-3 py-2 uppercase text-primary-fixed">
              {countdown}
            </span>
          )}
        </div>

        {/* h2 y no h1: el h1 de la portada es "Torneos activos", que es de lo
            que trata la pagina. Este anuncio es una seccion destacada adentro,
            por mas que visualmente sea lo primero y lo mas grande. */}
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile uppercase tracking-tight text-on-surface md:font-display-lg md:text-display-lg">
          {tournament.name}
        </h2>

        <dl className="flex flex-wrap gap-x-space-lg gap-y-space-sm border-t border-outline-variant pt-space-sm">
          {tournament.startsAt && (
            <div>
              <dt className="font-label-caps text-label-caps text-on-surface-variant">
                ARRANCA
              </dt>
              <dd className="font-headline-md text-headline-md mt-1 first-letter:uppercase text-on-surface">
                {formatStartDate(tournament.startsAt)}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-label-caps text-label-caps text-on-surface-variant">
              ANOTADOS
            </dt>
            <dd className="font-headline-md text-headline-md mt-1 text-on-surface">
              {players}
            </dd>
          </div>
          {fee && (
            <div>
              <dt className="font-label-caps text-label-caps text-on-surface-variant">
                INSCRIPCIÓN
              </dt>
              <dd className="font-headline-md text-headline-md mt-1 text-on-surface">
                {fee}
              </dd>
            </div>
          )}
        </dl>

        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center">
          <Link
            href={`/torneos/${tournament.id}/inscripcion`}
            className="font-label-caps text-label-caps neon-glow-hover rounded border border-primary-fixed bg-primary-fixed px-8 py-4 text-center uppercase tracking-wider text-on-primary-fixed transition-all duration-200 hover:bg-primary-fixed-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fixed"
          >
            Inscribirme
          </Link>
          <Link
            href={`/torneos/${tournament.id}`}
            className="font-label-caps text-label-caps rounded border border-surface-bright px-8 py-4 text-center uppercase tracking-wider text-on-surface-variant transition-colors hover:border-primary-fixed hover:text-primary-fixed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fixed"
          >
            Ver el torneo
          </Link>
        </div>
      </div>
    </section>
  );
}
