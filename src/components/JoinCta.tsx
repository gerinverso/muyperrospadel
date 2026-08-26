import Link from "next/link";
import { formatLongDate } from "@/lib/format";
import type { NextTournament } from "@/lib/next-tournament";

/**
 * Cierre de la home: repite la accion principal al final del scroll, con la
 * misma fila que ya trajo el anuncio de arriba. Es la unica accion primaria de
 * la pagina, no una tercera opcion nueva.
 */
export default function JoinCta({
  tournament,
}: {
  tournament: NextTournament;
}) {
  return (
    <section className="flex flex-col items-start justify-between gap-space-md border-t-2 border-primary-fixed bg-surface-container-lowest px-margin-mobile py-space-lg md:flex-row md:items-center md:px-margin-desktop">
      <div>
        <p className="font-label-caps text-label-caps mb-space-sm text-primary-fixed">
          Inscripción abierta
        </p>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile uppercase leading-[0.95] tracking-tight text-on-surface md:font-headline-lg md:text-headline-lg">
          Anotate en {tournament.name}
        </h2>
      </div>

      <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:items-end">
        <Link
          href={`/torneos/${tournament.id}/inscripcion`}
          className="font-label-caps text-label-caps flex min-h-16 items-center justify-center bg-primary-fixed px-space-lg text-center text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fixed"
        >
          Inscribirme
        </Link>
        <span className="font-label-caps text-label-caps text-outline">
          {tournament.startsAt
            ? `Arranca el ${formatLongDate(tournament.startsAt)}`
            : "Fecha a definir"}
        </span>
      </div>
    </section>
  );
}
