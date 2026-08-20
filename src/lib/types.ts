export type TournamentStatus =
  | "SETUP"
  | "PAIRS_DONE"
  | "GROUP_STAGE"
  | "IN_PROGRESS"
  | "FINISHED";

export type TournamentFormat = "SINGLE_ELIMINATION" | "GROUPS_KO";

/** Cómo se armaron las parejas: sorteadas al azar o formadas por el organizador. */
export type PairingMode = "DRAW" | "MANUAL";

/** Jugador global del club (se reutiliza en todos los torneos). */
export type Player = {
  id: string;
  name: string;
  dni?: string | null;
};

/** Jugador del listado maestro, con su uso en torneos. */
export type PlayerWithStats = Player & {
  _count: { tournaments: number };
};

export type Pair = {
  id: string;
  player1: Player;
  player2: Player;
  groupId?: string | null;
};

export type Match = {
  id: string;
  round: number;
  slot: number;
  groupId?: string | null;
  pairA: Pair | null;
  pairB: Pair | null;
  winner: Pair | null;
};

export type Group = {
  id: string;
  name: string;
  index: number;
  /** Clasificados propios de la zona; null usa el número general del torneo. */
  qualifiers: number | null;
  /** Orden manual para desempatar dentro de la zona (ids de pareja). */
  tiebreakOrder: string[];
  pairs: Pair[];
  matches: Match[];
};

export type TournamentSummary = {
  id: string;
  name: string;
  status: TournamentStatus;
  format: TournamentFormat;
  pairingMode: PairingMode;
  groupsCount: number | null;
  qualifiersPerGroup: number | null;
  createdAt: string;
  /** ISO de la fecha de inicio, o null si todavía no se definió. */
  startsAt: string | null;
  registrationOpen: boolean;
  registrationFee: string | null;
  courtCost: string | null;
  _count?: { players: number };
};

export type TournamentDetail = TournamentSummary & {
  players: Player[];
  pairs: Pair[];
  groups: Group[];
  matches: Match[];
};

export const statusLabels: Record<TournamentStatus, string> = {
  SETUP: "Cargando jugadores",
  PAIRS_DONE: "Parejas definidas",
  GROUP_STAGE: "Fase de grupos",
  IN_PROGRESS: "Cuadro en juego",
  FINISHED: "Finalizado",
};

export const formatLabels: Record<TournamentFormat, string> = {
  SINGLE_ELIMINATION: "Eliminación directa",
  GROUPS_KO: "Fase de grupos + eliminación",
};

export const pairingModeLabels: Record<PairingMode, string> = {
  DRAW: "Sorteadas al azar",
  MANUAL: "Formadas por el organizador",
};

export function pairLabel(pair: Pair | null | undefined): string {
  if (!pair) return "A definir";
  return `${pair.player1.name} / ${pair.player2.name}`;
}

/** Jugadores del torneo que todavía no están en ninguna pareja. */
export function unpairedPlayers(
  players: Player[],
  pairs: Pair[]
): Player[] {
  const taken = new Set(pairs.flatMap((p) => [p.player1.id, p.player2.id]));
  return players.filter((p) => !taken.has(p.id));
}
