import type { MergeCandidate } from "@/lib/players";

/**
 * Todo lo que hace falta para decidir si dos jugadores son la misma persona:
 * el DNI, los torneos a los que se anoto y en cuales llego a tener pareja.
 *
 * Vive aca y no en `players.ts` para que ese archivo siga siendo logica pura,
 * sin dependencias de Prisma, y se pueda testear sin base de datos.
 */
export const MERGE_CANDIDATE_SELECT = {
  id: true,
  name: true,
  nameKey: true,
  dni: true,
  createdAt: true,
  tournaments: { select: { id: true, name: true } },
  pairsAsPlayer1: { select: { tournament: { select: { id: true, name: true } } } },
  pairsAsPlayer2: { select: { tournament: { select: { id: true, name: true } } } },
} as const;

type MergeCandidateRow = {
  id: string;
  name: string;
  dni: string | null;
  tournaments: { id: string; name: string }[];
  pairsAsPlayer1: { tournament: { id: string; name: string } }[];
  pairsAsPlayer2: { tournament: { id: string; name: string } }[];
};

/** Aplana las parejas de los dos lados en la lista de torneos donde jugo. */
export function toMergeCandidate(row: MergeCandidateRow): MergeCandidate {
  const paired = new Map<string, { id: string; name: string }>();
  for (const pair of [...row.pairsAsPlayer1, ...row.pairsAsPlayer2]) {
    paired.set(pair.tournament.id, pair.tournament);
  }

  return {
    id: row.id,
    name: row.name,
    dni: row.dni,
    tournaments: row.tournaments,
    pairedTournaments: [...paired.values()],
  };
}
