import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const withPlayers = { include: { player1: true, player2: true } };

const withPairs = {
  include: {
    pairA: withPlayers,
    pairB: withPlayers,
    winner: withPlayers,
  },
};

/**
 * Todo lo que necesitan el panel del organizador y la vista pública de un
 * torneo. Estaba repetido en cada endpoint que devolvía el torneo entero: si se
 * agrega una relación, alcanza con tocarlo acá.
 */
export const tournamentDetailInclude = {
  players: { orderBy: { name: "asc" } },
  pairs: { orderBy: { createdAt: "asc" }, ...withPlayers },
  groups: {
    orderBy: { index: "asc" },
    include: {
      pairs: withPlayers,
      matches: { orderBy: { slot: "asc" }, ...withPairs },
    },
  },
  matches: {
    where: { groupId: null },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
    ...withPairs,
  },
} satisfies Prisma.TournamentInclude;

/** Carga el torneo completo, listo para devolver por la API. */
export function loadTournamentDetail(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    relationLoadStrategy: "join",
    include: tournamentDetailInclude,
  });
}
