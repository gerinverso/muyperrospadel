import { prisma } from "@/lib/prisma";
import { formatFee } from "@/lib/format";

/**
 * El proximo torneo con inscripcion abierta, ya listo para mostrar.
 *
 * La home lo usa dos veces (el anuncio de arriba y el cierre con la accion
 * repetida), asi que la consulta vive aca y se hace una sola vez por request.
 * `fee` sale formateado para no arrastrar el Decimal de Prisma hasta la vista.
 */
export type NextTournament = {
  id: string;
  name: string;
  startsAt: Date | null;
  /** Lo que pone cada jugador, o null si todavía no se definió. */
  fee: string | null;
  players: number;
};

export async function nextOpenTournament(): Promise<NextTournament | null> {
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

  return {
    id: tournament.id,
    name: tournament.name,
    startsAt: tournament.startsAt,
    fee: formatFee(tournament.registrationFee),
    players: tournament._count.players,
  };
}
