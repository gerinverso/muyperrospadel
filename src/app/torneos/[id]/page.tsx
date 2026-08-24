import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadTournamentDetail } from "@/lib/tournament-query";
import { pairLabel, pairingModeLabels, statusLabels } from "@/lib/types";
import BracketView from "@/components/BracketView";
import GroupsView from "@/components/GroupsView";
import type { Match } from "@/lib/types";

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await loadTournamentDetail(id);

  if (!tournament) notFound();

  const prize =
    tournament.registrationFee !== null && tournament.courtCost !== null
      ? Number(tournament.registrationFee) * tournament.players.length -
        Number(tournament.courtCost)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-4">
        <Link
          href="/"
          className="text-sm text-on-surface-variant hover:text-primary-fixed hover:underline"
        >
          ← Todos los torneos
        </Link>
        <div className="card-border relative flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-white">
          <Image
            src="/logo.jpg"
            alt="Muy Perros Pádel"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="object-contain p-3"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-headline-md text-headline-md text-on-surface">
            {tournament.name}
          </h1>
          <span className="whitespace-nowrap rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">
            {statusLabels[tournament.status]}
          </span>
        </div>
      </header>

      {prize !== null && (
        <section className="card-border rounded-lg bg-surface-container p-5 text-center">
          <p className="text-sm text-on-surface-variant">Premio del torneo</p>
          <p className="text-2xl font-bold text-primary-fixed">
            ${prize.toFixed(2)}
          </p>
        </section>
      )}

      {tournament.status === "SETUP" && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-3 text-lg font-semibold text-on-surface">
            Jugadores anotados
          </h2>
          {tournament.players.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Todavía no hay jugadores anotados.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {tournament.players.map((p) => (
                <li
                  key={p.id}
                  className="rounded-full bg-surface-container-high px-3 py-1 text-sm text-on-surface"
                >
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tournament.pairs.length > 0 && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-1 text-lg font-semibold text-on-surface">
            Parejas
          </h2>
          <p className="mb-3 text-sm text-on-surface-variant">
            {pairingModeLabels[tournament.pairingMode]}
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tournament.pairs.map((pair, i) => (
              <li
                key={pair.id}
                className="rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface"
              >
                {i + 1}. {pairLabel(pair)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tournament.groups.length > 0 && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-4 text-lg font-semibold text-on-surface">
            Fase de grupos
          </h2>
          <GroupsView
            groups={tournament.groups}
            qualifiersPerGroup={tournament.qualifiersPerGroup ?? 1}
          />
        </section>
      )}

      {tournament.matches.length > 0 && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-4 text-lg font-semibold text-on-surface">
            {tournament.groups.length > 0 ? "Cuadro final" : "Cuadro"}
          </h2>
          <BracketView matches={tournament.matches as Match[]} />
        </section>
      )}
    </div>
  );
}
