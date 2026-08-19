import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computeRanking,
  seasonOf,
  seasonRange,
  RANKING_POINTS,
  STAGE_LABELS,
  STAGE_ORDER,
  type RankingTournament,
} from "@/lib/ranking";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ temporada?: string }>;
}) {
  const { temporada } = await searchParams;

  // Temporadas con al menos un torneo terminado, para armar el selector.
  const finished = await prisma.tournament.findMany({
    where: { status: "FINISHED" },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const currentYear = seasonOf(new Date());
  const seasons = [
    ...new Set([currentYear, ...finished.map((t) => seasonOf(t.createdAt))]),
  ].sort((a, b) => b - a);

  const parsed = Number(temporada);
  const season =
    Number.isInteger(parsed) && seasons.includes(parsed) ? parsed : seasons[0];

  const tournaments = await prisma.tournament.findMany({
    where: { status: "FINISHED", createdAt: seasonRange(season) },
    relationLoadStrategy: "join",
    include: {
      pairs: { include: { player1: true, player2: true } },
      groups: { include: { pairs: { select: { id: true } }, matches: true } },
      matches: true,
    },
  });

  const ranking = computeRanking(tournaments as unknown as RankingTournament[]);

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow px-margin-mobile py-space-lg md:px-margin-desktop">
      <header className="mb-space-lg flex flex-col items-start justify-between gap-space-md md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile uppercase tracking-tight text-primary-fixed md:font-headline-lg md:text-headline-lg">
            Ranking {season}
          </h1>
          <p className="font-body-lg text-body-lg mt-2 max-w-2xl text-on-surface-variant">
            Puntos acumulados por los jugadores en los torneos terminados de la
            temporada.
          </p>
        </div>

        {seasons.length > 1 && (
          <div className="flex flex-wrap gap-space-xs">
            {seasons.map((y) => (
              <Link
                key={y}
                href={y === seasons[0] ? "/ranking" : `/ranking?temporada=${y}`}
                className={`font-label-caps text-label-caps rounded-full border px-4 py-2 transition-colors ${
                  y === season
                    ? "border-primary-fixed bg-primary-fixed/10 text-primary-fixed"
                    : "border-surface-bright text-on-surface-variant hover:border-primary-fixed hover:text-primary-fixed"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        )}
      </header>

      {ranking.length === 0 ? (
        <p className="card-border rounded-lg bg-surface-container p-6 text-center text-on-surface-variant">
          Todavía no hay torneos terminados en la temporada {season}. El ranking
          se arma solo cuando un torneo llega a tener campeón.
        </p>
      ) : (
        <div className="card-border overflow-hidden rounded-lg bg-surface-container">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-surface-bright bg-surface-container-high">
                  <th className="font-label-caps text-label-caps px-4 py-3 text-on-surface-variant">
                    #
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-3 text-on-surface-variant">
                    Jugador
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-3 text-right text-on-surface-variant">
                    Puntos
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-3 text-right text-on-surface-variant">
                    Torneos
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-3 text-right text-on-surface-variant">
                    Títulos
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-3 text-right text-on-surface-variant">
                    Finales
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row) => {
                  const medal = MEDALS[row.tier];
                  return (
                    <tr
                      key={row.player.id}
                      className="border-b border-surface-bright/50 last:border-0 hover:bg-surface-container-high"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`font-headline-md text-headline-md ${
                            row.tier < MEDALS.length
                              ? "text-primary-fixed"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {medal ?? row.position}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-on-surface">
                          {row.player.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-headline-md text-headline-md text-primary-fixed">
                          {row.points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface">
                        {row.tournaments}
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface">
                        {row.titles > 0 ? `🏆 ${row.titles}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface">
                        {row.finals > 0 ? row.finals : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="card-border mt-space-lg rounded-lg bg-surface-container p-space-md">
        <h2 className="font-headline-md text-headline-md mb-space-sm text-on-surface">
          Cómo se suman los puntos
        </h2>
        <p className="mb-space-sm text-sm text-on-surface-variant">
          Los puntos se otorgan según hasta dónde llegó la pareja. Los dos
          integrantes suman el total (no se divide entre los dos).
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STAGE_ORDER.map((stage) => (
            <li
              key={stage}
              className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2 text-sm"
            >
              <span className="text-on-surface">{STAGE_LABELS[stage]}</span>
              <span className="font-semibold text-primary-fixed">
                {RANKING_POINTS[stage]} pts
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
