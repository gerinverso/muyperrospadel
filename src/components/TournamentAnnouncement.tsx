import Link from "next/link";
import { connection } from "next/server";
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
 * Barra de anuncio del proximo torneo, arriba de todo y en todas las paginas.
 *
 * Muestra el torneo con inscripciones abiertas que arranca antes. Los que no
 * tienen fecha cargada se anuncian igual (van ultimos y sin cuenta regresiva):
 * la fecha es opcional y no tiene por que esconder el anuncio.
 *
 * Si no hay ninguno no renderiza nada, asi que el resto del sitio queda igual
 * que antes.
 */
export default async function TournamentAnnouncement() {
  // El anuncio depende de la hora actual (la cuenta regresiva), asi que no
  // puede prerenderizarse: tiene que resolverse en cada request.
  await connection();

  const tournament = await prisma.tournament.findFirst({
    where: { registrationOpen: true, status: "SETUP" },
    orderBy: { startsAt: { sort: "asc", nulls: "last" } },
    select: {
      id: true,
      name: true,
      startsAt: true,
      _count: { select: { players: true } },
    },
  });

  if (!tournament) return null;

  const countdown = countdownLabel(tournament.startsAt, new Date());
  const players = tournament._count.players;

  return (
    <aside className="w-full border-b border-primary-fixed/30 bg-primary-fixed/10 px-margin-mobile py-3 md:px-margin-desktop">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-space-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed">
            campaign
          </span>
          <div>
            <p className="font-label-caps text-label-caps text-primary-fixed">
              Nuevo torneo · Inscripción abierta
            </p>
            <p className="font-headline-md text-headline-md text-on-surface">
              {tournament.name}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {tournament.startsAt && (
                <span className="capitalize">
                  {formatStartDate(tournament.startsAt)}
                </span>
              )}
              {tournament.startsAt && countdown && " · "}
              {countdown && (
                <span className="font-bold text-tertiary-fixed">{countdown}</span>
              )}
              {(tournament.startsAt || countdown) && " · "}
              {players === 0
                ? "Todavía no se anotó nadie"
                : `${players} anotado${players === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <Link
          href={`/torneos/${tournament.id}/inscripcion`}
          className="font-label-caps text-label-caps w-full shrink-0 rounded bg-primary-fixed px-6 py-3 text-center font-bold uppercase tracking-wider text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim md:w-auto"
        >
          Inscribirme
        </Link>
      </div>
    </aside>
  );
}
