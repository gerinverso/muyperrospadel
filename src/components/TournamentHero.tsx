import Link from "next/link";
import { daysUntil } from "@/lib/countdown";
import { formatLongDate } from "@/lib/format";
import type { NextTournament } from "@/lib/next-tournament";

/**
 * Anuncio del proximo torneo con inscripcion abierta, con forma de marcador: a
 * la izquierda el nombre y los datos duros, a la derecha el bloque lima con la
 * cuenta regresiva y la accion principal.
 *
 * El torneo llega por props (lo busca la home con `nextOpenTournament`) porque
 * el cierre de la pagina repite la misma accion y seria una segunda consulta
 * por la misma fila.
 */
export default function TournamentHero({
  tournament,
}: {
  tournament: NextTournament;
}) {
  const { players, fee, startsAt } = tournament;
  const days = startsAt ? daysUntil(startsAt, new Date()) : null;
  // Un torneo que ya arrancó puede seguir con la inscripción abierta: ahí el
  // bloque lima deja de contar días y sólo dice que sigue abierta.
  const counting = days !== null && days >= 0;

  return (
    <section className="grid grid-cols-1 border-b border-surface-bright lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="court-lines flex flex-col border-b border-surface-bright lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center gap-space-xs border-b border-surface-bright bg-surface-container-low px-margin-mobile py-space-sm md:px-margin-desktop">
          <span aria-hidden="true" className="h-2 w-2 bg-primary-fixed" />
          <span className="font-label-caps text-label-caps text-primary-fixed">
            Inscripción abierta
          </span>
          <span className="font-label-caps text-label-caps text-outline">
            · el sorteo arma las parejas
          </span>
        </div>

        {/* h2 y no h1: el h1 de la portada es el título de la página. Este
            anuncio es una sección destacada adentro, por más que visualmente
            sea lo primero y lo más grande. */}
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile px-margin-mobile py-space-md uppercase leading-[0.9] tracking-tight text-on-surface md:px-margin-desktop md:py-space-lg md:font-display-lg md:text-display-lg">
          {tournament.name}
        </h2>

        <dl className="mt-auto grid grid-cols-1 gap-px border-t border-surface-bright bg-surface-bright sm:grid-cols-3">
          <div className="bg-background px-margin-mobile py-space-sm md:px-margin-desktop">
            <dt className="font-label-caps text-label-caps text-outline">
              Arranca
            </dt>
            <dd className="font-headline-md text-headline-md mt-3 text-on-surface first-letter:uppercase">
              {startsAt ? formatLongDate(startsAt) : "A definir"}
            </dd>
          </div>
          <div className="bg-background px-margin-mobile py-space-sm md:px-space-md">
            <dt className="font-label-caps text-label-caps text-outline">
              Anotados
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
            {counting ? "Arranca en" : "Inscripción"}
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
              Abierta
            </p>
          )}

          <p className="font-label-caps text-label-caps mt-space-sm border-t border-on-primary-fixed/25 pt-space-sm text-on-primary-fixed-variant">
            {startsAt ? formatLongDate(startsAt) : "La fecha se define pronto"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/torneos/${tournament.id}/inscripcion`}
            className="font-label-caps text-label-caps flex min-h-14 items-center justify-center bg-background text-center text-primary-fixed transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            Inscribirme
          </Link>
          <Link
            href={`/torneos/${tournament.id}`}
            className="font-label-caps text-label-caps flex min-h-14 items-center justify-center border border-on-primary-fixed text-center text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            Ver el torneo
          </Link>
        </div>
      </div>
    </section>
  );
}
