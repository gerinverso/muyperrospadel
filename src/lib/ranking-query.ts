import { prisma } from "@/lib/prisma";
import {
  computeRanking,
  seasonOf,
  seasonRange,
  type RankingRow,
  type RankingTournament,
} from "@/lib/ranking";

/**
 * Temporadas con al menos un torneo terminado, de la mas nueva a la mas vieja.
 * La temporada actual va siempre, aunque todavia no tenga campeones: es la que
 * se muestra por defecto.
 */
export async function finishedSeasons(): Promise<number[]> {
  const finished = await prisma.tournament.findMany({
    where: { status: "FINISHED" },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return [
    ...new Set([
      seasonOf(new Date()),
      ...finished.map((t) => seasonOf(t.createdAt)),
    ]),
  ].sort((a, b) => b - a);
}

/**
 * Ranking de una temporada.
 *
 * La consulta trae parejas, zonas y partidos porque el puntaje depende de hasta
 * donde llego cada pareja, no de un campo guardado. Vive aca y no en la pagina
 * porque la usan dos: la home (el top de la tabla) y /ranking (la tabla
 * completa).
 */
export async function seasonRanking(season: number): Promise<RankingRow[]> {
  const tournaments = await prisma.tournament.findMany({
    where: { status: "FINISHED", createdAt: seasonRange(season) },
    relationLoadStrategy: "join",
    include: {
      pairs: { include: { player1: true, player2: true } },
      groups: { include: { pairs: { select: { id: true } }, matches: true } },
      matches: true,
    },
  });

  return computeRanking(tournaments as unknown as RankingTournament[]);
}
