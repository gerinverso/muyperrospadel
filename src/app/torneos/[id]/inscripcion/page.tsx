import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { countdownLabel } from "@/lib/countdown";
import RegistrationForm from "@/components/RegistrationForm";

export const dynamic = "force-dynamic";

function formatStartDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      startsAt: true,
      registrationOpen: true,
      registrationFee: true,
      _count: { select: { players: true } },
    },
  });

  if (!tournament) notFound();

  const open = tournament.registrationOpen && tournament.status === "SETUP";
  const countdown = countdownLabel(tournament.startsAt, new Date());

  return (
    <main className="mx-auto flex w-full max-w-xl flex-grow flex-col gap-space-md px-margin-mobile py-space-lg md:px-margin-desktop">
      <header>
        <Link
          href={`/torneos/${tournament.id}`}
          className="text-sm text-on-surface-variant hover:text-primary-fixed hover:underline"
        >
          ← Ver el torneo
        </Link>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile mt-1 uppercase tracking-tight text-primary-fixed md:font-headline-lg md:text-headline-lg">
          {tournament.name}
        </h1>
        <p className="font-body-lg text-body-lg mt-2 text-on-surface-variant">
          {tournament.startsAt && (
            <span className="capitalize">
              {formatStartDate(tournament.startsAt)}
            </span>
          )}
          {tournament.startsAt && countdown && " · "}
          {countdown && (
            <span className="font-bold text-tertiary-fixed">{countdown}</span>
          )}
        </p>
      </header>

      {open ? (
        <>
          <section className="card-border rounded-lg bg-surface-container p-space-md">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Anotate para el sorteo de parejas. Ya hay{" "}
              <span className="font-bold text-on-surface">
                {tournament._count.players}
              </span>{" "}
              jugador(es) anotado(s)
              {tournament.registrationFee
                ? `, y la inscripción sale $${Number(tournament.registrationFee).toFixed(2)}`
                : ""}
              .
            </p>
          </section>

          <RegistrationForm tournamentId={tournament.id} />
        </>
      ) : (
        <section className="card-border rounded-lg bg-surface-container p-space-md text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">
            lock
          </span>
          <p className="font-headline-md text-headline-md mt-2 text-on-surface">
            Las inscripciones están cerradas
          </p>
          <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
            {tournament.status === "SETUP"
              ? "Todavía no se abrieron o ya las cerró el organizador."
              : "Ya se sortearon las parejas de este torneo."}
          </p>
          <Link
            href={`/torneos/${tournament.id}`}
            className="font-label-caps text-label-caps mt-space-md inline-block rounded bg-primary-fixed px-6 py-3 font-bold uppercase tracking-wider text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim"
          >
            Ver el torneo
          </Link>
        </section>
      )}
    </main>
  );
}
