import Link from "next/link";
import { daysUntil } from "@/lib/countdown";
import { formatLongDate } from "@/lib/format";
import { statusLabels } from "@/lib/types";
import type { HomeTournament } from "@/lib/home-tournaments";

/**
 * El aviso de torneos de la home, debajo de la portada: si hay uno con la
 * inscripcion abierta, si hay uno jugandose, o si no hay ninguno.
 *
 * Los dos estados no se pisan (uno pide `SETUP`, el otro parejas ya armadas),
 * asi que pueden convivir. Cuando pasa, el que manda es el abierto (es el que
 * tiene algo para hacer) y el que se esta jugando queda en una franja debajo.
 */
export default function TournamentNotice({
  open,
  live,
}: {
  open: HomeTournament | null;
  live: HomeTournament | null;
}) {
  if (!open && !live) return <NoTournament />;

  return (
    <>
      {open && <TournamentBlock tournament={open} live={false} />}
      {live &&
        (open ? (
          <LiveStrip tournament={live} />
        ) : (
          <TournamentBlock tournament={live} live />
        ))}
    </>
  );
}

/**
 * El anuncio grande, con forma de marcador: a la izquierda el nombre y los
 * datos duros, a la derecha el bloque lima con la cuenta regresiva (o el
 * estado, si el torneo ya arranco) y la accion principal.
 */
function TournamentBlock({
  tournament,
  live,
}: {
  tournament: HomeTournament;
  live: boolean;
}) {
  const { players, fee, startsAt } = tournament;
  const days = startsAt ? daysUntil(startsAt, new Date()) : null;
  // Un torneo que ya arrancó puede seguir con la inscripción abierta: ahí el
  // bloque lima deja de contar días y sólo dice que sigue abierta.
  const counting = !live && days !== null && days >= 0;

  return (
    <section className="grid grid-cols-1 border-b border-surface-bright lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="court-lines flex flex-col border-b border-surface-bright lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center gap-space-xs border-b border-surface-bright bg-surface-container-low px-margin-mobile py-space-sm md:px-margin-desktop">
          <span aria-hidden="true" className="h-2 w-2 bg-primary-fixed" />
          <span className="font-label-caps text-label-caps text-primary-fixed">
            {live ? "Torneo en curso" : "Inscripción abierta"}
          </span>
          <span className="font-label-caps text-label-caps text-outline">
            {live
              ? `· ${statusLabels[tournament.status]}`
              : "· el sorteo arma las parejas"}
          </span>
        </div>

        {/* h2 y no h1: el h1 de la portada es el nombre del club. Este anuncio
            es una sección destacada adentro, por más que sea lo más grande
            después de la foto. */}
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile px-margin-mobile py-space-md uppercase leading-[0.9] tracking-tight text-on-surface md:px-margin-desktop md:py-space-lg md:font-display-lg md:text-display-lg">
          {tournament.name}
        </h2>

        <dl className="mt-auto grid grid-cols-1 gap-px border-t border-surface-bright bg-surface-bright sm:grid-cols-3">
          <div className="bg-background px-margin-mobile py-space-sm md:px-margin-desktop">
            <dt className="font-label-caps text-label-caps text-outline">
              {live ? "Arrancó" : "Arranca"}
            </dt>
            <dd className="font-headline-md text-headline-md mt-3 text-on-surface first-letter:uppercase">
              {startsAt ? formatLongDate(startsAt) : "A definir"}
            </dd>
          </div>
          <div className="bg-background px-margin-mobile py-space-sm md:px-space-md">
            <dt className="font-label-caps text-label-caps text-outline">
              {live ? "Jugadores" : "Anotados"}
            </dt>
            <dd className="font-headline-md text-headline-md mt-3 tabular-nums text-on-surface">
              {players} {players === 1 ? "jugador" : "jugadores"}
            </dd>
          </div>
          <div className="bg-background px-margin-mobile py-space-sm md:px-space-md">
            <dt className="font-label-caps text-label-caps text-outline">
              Por jugador
            </dt>
            <dd className="font-headline-md text-headline-md mt-3 tabular-nums text-on-surface">
              {fee ?? "A definir"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col justify-between gap-space-md bg-primary-fixed px-margin-mobile py-space-md md:px-space-md">
        <div>
          <p className="font-label-caps text-label-caps text-on-primary-fixed-variant">
            {live ? "Estado" : counting ? "Arranca en" : "Inscripción"}
          </p>

          {counting ? (
            <>
              <p className="font-display-lg mt-3 text-[120px] font-black leading-[0.78] tracking-tighter tabular-nums text-on-primary-fixed">
                {days === 0 ? "HOY" : String(days).padStart(2, "0")}
              </p>
              {days !== 0 && (
                <p className="font-headline-lg text-headline-lg uppercase leading-none text-on-primary-fixed">
                  {days === 1 ? "día" : "días"}
                </p>
              )}
            </>
          ) : (
            <p className="font-display-lg mt-3 text-[64px] font-black uppercase leading-[0.9] tracking-tight text-on-primary-fixed">
              {live ? "En juego" : "Abierta"}
            </p>
          )}

          <p className="font-label-caps text-label-caps mt-space-sm border-t border-on-primary-fixed/25 pt-space-sm text-on-primary-fixed-variant">
            {startsAt ? formatLongDate(startsAt) : "La fecha se define pronto"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {!live && (
            <Link
              href={`/torneos/${tournament.id}/inscripcion`}
              className="font-label-caps text-label-caps flex min-h-14 items-center justify-center bg-background text-center text-primary-fixed transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
            >
              Inscribirme
            </Link>
          )}
          <Link
            href={`/torneos/${tournament.id}`}
            className={`font-label-caps text-label-caps flex min-h-14 items-center justify-center text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background ${
              live
                ? "bg-background text-primary-fixed hover:bg-surface-container-high"
                : "border border-on-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim"
            }`}
          >
            {live ? "Ver el cuadro" : "Ver el torneo"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * El torneo que se esta jugando, cuando arriba ya esta el anuncio de otro con
 * la inscripcion abierta: una franja de una linea, para no competir con el.
 */
function LiveStrip({ tournament }: { tournament: HomeTournament }) {
  return (
    <section className="flex flex-col gap-space-xs border-b border-surface-bright bg-surface-container-low px-margin-mobile py-space-sm md:flex-row md:items-center md:justify-between md:px-margin-desktop">
      <p className="flex flex-wrap items-center gap-space-xs">
        <span aria-hidden="true" className="h-2 w-2 bg-tertiary-fixed" />
        <span className="font-label-caps text-label-caps text-tertiary-fixed">
          En juego ahora
        </span>
        <span className="font-headline-md text-headline-md text-on-surface">
          {tournament.name}
        </span>
        <span className="font-label-caps text-label-caps text-outline">
          · {statusLabels[tournament.status]}
        </span>
      </p>

      <Link
        href={`/torneos/${tournament.id}`}
        className="font-label-caps text-label-caps flex min-h-11 items-center text-primary-fixed transition-colors hover:text-primary-fixed-dim"
      >
        Ver el cuadro →
      </Link>
    </section>
  );
}

/** Ni torneo abierto ni torneo en juego: lo decimos en vez de no mostrar nada. */
function NoTournament() {
  return (
    <section className="border-b border-surface-bright px-margin-mobile py-space-lg md:px-margin-desktop">
      <div className="flex flex-col items-start gap-space-md border border-surface-bright bg-surface-container p-space-md md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex flex-wrap items-center gap-space-xs">
            <span aria-hidden="true" className="h-2 w-2 bg-outline" />
            <span className="font-label-caps text-label-caps text-outline">
              Sin torneos abiertos
            </span>
          </p>
          <h2 className="font-headline-md text-headline-md mt-3 text-on-surface">
            Ahora mismo no hay ningún torneo para anotarse ni en juego
          </h2>
          <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
            Cuando se abra la inscripción del próximo, el aviso aparece acá.
          </p>
        </div>

        <Link
          href="#torneos"
          className="font-label-caps text-label-caps flex min-h-11 shrink-0 items-center text-primary-fixed transition-colors hover:text-primary-fixed-dim"
        >
          Torneos anteriores →
        </Link>
      </div>
    </section>
  );
}
