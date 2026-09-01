import { prisma } from "@/lib/prisma";
import { formatFee } from "@/lib/format";
import type { TournamentStatus } from "@/lib/types";

/**
 * Los torneos que la home puede anunciar: el que tiene la inscripcion abierta
 * y el que se esta jugando ahora.
 *
 * Las consultas viven aca y no en la pagina porque el cierre de la home repite
 * la accion del torneo abierto y seria una segunda consulta por la misma fila.
 * `fee` sale formateado para no arrastrar el Decimal de Prisma hasta la vista.
 */
export type HomeTournament = {
  id: string;
  name: string;
  status: TournamentStatus;
  startsAt: Date | null;
  /** Lo que pone cada jugador, o null si todavía no se definió. */
  fee: string | null;
  players: number;
};

/**
 * Estados en los que el torneo ya se esta jugando: hay parejas y algo que
 * mirar (zonas o cuadro). `SETUP` queda afuera porque todavia no hay nada, y
 * `FINISHED` porque lo que muestra es el ranking, no el aviso.
 */
const LIVE_STATUSES: TournamentStatus[] = [
  "PAIRS_DONE",
  "GROUP_STAGE",
  "IN_PROGRESS",
];

function toHomeTournament(row: {
  id: string;
  name: string;
  status: string;
  startsAt: Date | null;
  registrationFee: unknown;
  _count: { players: number };
}): HomeTournament {
  return {
    id: row.id,
    name: row.name,
    status: row.status as TournamentStatus,
    startsAt: row.startsAt,
    fee: formatFee(row.registrationFee),
    players: row._count.players,
  };
}

/** El proximo torneo en el que cualquiera puede anotarse desde la web. */
export async function nextOpenTournament(): Promise<HomeTournament | null> {
  const tournament = await prisma.tournament.findFirst({
    where: { registrationOpen: true, status: "SETUP" },
    orderBy: { startsAt: { sort: "asc", nulls: "last" } },
    select: {
      id: true,
      name: true,
      status: true,
      startsAt: true,
      registrationFee: true,
      _count: { select: { players: true } },
    },
  });

  return tournament ? toHomeTournament(tournament) : null;
}

/**
 * El torneo que se esta jugando ahora. Si hubiera mas de uno en juego gana el
 * que arranco ultimo: es el que la gente esta mirando.
 */
export async function liveTournament(): Promise<HomeTournament | null> {
  const tournament = await prisma.tournament.findFirst({
    where: { status: { in: LIVE_STATUSES } },
    orderBy: [
      { startsAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      status: true,
      startsAt: true,
      registrationFee: true,
      _count: { select: { players: true } },
    },
  });

  return tournament ? toHomeTournament(tournament) : null;
}
