import { computeGroupStandings, type GroupMatchResult } from "@/lib/groups";

/**
 * Puntos que reparte cada instancia del torneo. Los dos integrantes de la
 * pareja suman el total (no se divide entre ambos).
 */
export const RANKING_POINTS = {
  champion: 100,
  runnerUp: 70,
  semifinal: 50,
  quarterfinal: 30,
  roundOf16: 15,
  groupEliminated: 10,
  participation: 5,
} as const;

export type RankingStage = keyof typeof RANKING_POINTS;

export const STAGE_LABELS: Record<RankingStage, string> = {
  champion: "Campeón",
  runnerUp: "Subcampeón",
  semifinal: "Semifinalista",
  quarterfinal: "Cuartos de final",
  roundOf16: "Octavos de final",
  groupEliminated: "Eliminado en zona",
  participation: "Participación",
};

/** Orden de mejor a peor, para mostrar la tabla de puntajes. */
export const STAGE_ORDER: RankingStage[] = [
  "champion",
  "runnerUp",
  "semifinal",
  "quarterfinal",
  "roundOf16",
  "groupEliminated",
  "participation",
];

// --- Formas minimas de datos que necesita el calculo ---------------------

export type RankingPlayer = { id: string; name: string };

export type RankingPair = {
  id: string;
  player1: RankingPlayer;
  player2: RankingPlayer;
};

export type RankingMatch = {
  round: number;
  slot: number;
  groupId: string | null;
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
};

export type RankingGroup = {
  id: string;
  pairs: { id: string }[];
  matches: RankingMatch[];
};

export type RankingTournament = {
  id: string;
  name: string;
  createdAt: Date;
  pairs: RankingPair[];
  groups: RankingGroup[];
  /** Todos los partidos del torneo (zonas + cuadro). */
  matches: RankingMatch[];
};

export type PairResult = { stage: RankingStage; points: number };

// --- Calculo por torneo ---------------------------------------------------

function stageForKnockoutExit(
  lastRound: number,
  totalRounds: number
): RankingStage {
  // Cuantas rondas le faltaban para la final: 0 = perdio la final,
  // 1 = semifinal, 2 = cuartos, 3 = octavos.
  const roundsFromFinal = totalRounds - lastRound;
  if (roundsFromFinal <= 0) return "runnerUp";
  if (roundsFromFinal === 1) return "semifinal";
  if (roundsFromFinal === 2) return "quarterfinal";
  if (roundsFromFinal === 3) return "roundOf16";
  // Cuadros mas grandes que 16 parejas: rondas previas a octavos.
  return "participation";
}

/**
 * Determina hasta donde llego cada pareja del torneo y cuantos puntos le
 * corresponden.
 *
 * - En el cuadro de eliminacion vale la ronda mas profunda que alcanzo.
 * - Las parejas que quedaron afuera en la fase de grupos puntuan segun su
 *   posicion en la zona: 3era o mejor suma "eliminado en zona", 4ta o peor
 *   suma "participacion".
 */
export function computePairResults(
  tournament: RankingTournament
): Map<string, PairResult> {
  const results = new Map<string, PairResult>();

  const knockout = tournament.matches.filter((m) => m.groupId === null);

  if (knockout.length > 0) {
    const totalRounds = Math.max(...knockout.map((m) => m.round));
    const finalMatch = knockout.find(
      (m) => m.round === totalRounds && m.slot === 0
    );
    const championId = finalMatch?.winnerId ?? null;

    // Ronda mas profunda en la que aparece cada pareja. Contempla los byes:
    // la pareja que pasa libre igual figura en la ronda siguiente.
    const deepestRound = new Map<string, number>();
    for (const match of knockout) {
      for (const pairId of [match.pairAId, match.pairBId]) {
        if (!pairId) continue;
        const current = deepestRound.get(pairId) ?? 0;
        if (match.round > current) deepestRound.set(pairId, match.round);
      }
    }

    for (const [pairId, lastRound] of deepestRound) {
      const stage: RankingStage =
        pairId === championId
          ? "champion"
          : stageForKnockoutExit(lastRound, totalRounds);
      results.set(pairId, { stage, points: RANKING_POINTS[stage] });
    }
  }

  // Parejas que no llegaron al cuadro: puntuan por su puesto en la zona.
  for (const group of tournament.groups) {
    const groupMatches: GroupMatchResult[] = group.matches.map((m) => ({
      pairAId: m.pairAId,
      pairBId: m.pairBId,
      winnerId: m.winnerId,
    }));
    const standings = computeGroupStandings(
      group.pairs.map((p) => p.id),
      groupMatches
    );
    standings.forEach((row, index) => {
      if (results.has(row.pairId)) return; // clasifico: ya puntuo en el cuadro
      const position = index + 1;
      const stage: RankingStage =
        position <= 3 ? "groupEliminated" : "participation";
      results.set(row.pairId, { stage, points: RANKING_POINTS[stage] });
    });
  }

  // Red de seguridad: cualquier pareja que no aparezca en zonas ni en el
  // cuadro igual suma por haber participado.
  for (const pair of tournament.pairs) {
    if (!results.has(pair.id)) {
      results.set(pair.id, {
        stage: "participation",
        points: RANKING_POINTS.participation,
      });
    }
  }

  return results;
}

// --- Ranking acumulado ----------------------------------------------------

export type RankingRow = {
  position: number;
  /**
   * Escalon de puntaje, empezando en 0. Como los puntos se reparten por pareja
   * siempre hay al menos dos jugadores por escalon, asi que las medallas se
   * asignan por escalon y no por posicion (si no, nunca habria medalla de plata).
   */
  tier: number;
  player: RankingPlayer;
  points: number;
  tournaments: number;
  titles: number;
  finals: number;
  /** Detalle por torneo, del mas reciente al mas viejo. */
  history: {
    tournamentId: string;
    tournamentName: string;
    stage: RankingStage;
    points: number;
    partner: string;
  }[];
};

/**
 * Suma los puntos de cada jugador a lo largo de los torneos recibidos.
 * Se espera que vengan ya filtrados por temporada y en estado FINISHED.
 */
export function computeRanking(tournaments: RankingTournament[]): RankingRow[] {
  // La posicion y el escalon se calculan al final, una vez sumado todo.
  type Accumulated = Omit<RankingRow, "position" | "tier">;
  const byPlayer = new Map<string, Accumulated>();

  // Del mas reciente al mas viejo, para que el historial quede ordenado.
  const ordered = [...tournaments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  for (const tournament of ordered) {
    const pairResults = computePairResults(tournament);

    for (const pair of tournament.pairs) {
      const result = pairResults.get(pair.id);
      if (!result) continue;

      for (const [player, partner] of [
        [pair.player1, pair.player2],
        [pair.player2, pair.player1],
      ] as const) {
        let row: Accumulated | undefined = byPlayer.get(player.id);
        if (!row) {
          row = {
            player,
            points: 0,
            tournaments: 0,
            titles: 0,
            finals: 0,
            history: [],
          };
          byPlayer.set(player.id, row);
        }
        row.points += result.points;
        row.tournaments += 1;
        if (result.stage === "champion") row.titles += 1;
        if (result.stage === "champion" || result.stage === "runnerUp") {
          row.finals += 1;
        }
        row.history.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          stage: result.stage,
          points: result.points,
          partner: partner.name,
        });
      }
    }
  }

  const sorted = [...byPlayer.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.titles - a.titles ||
      b.finals - a.finals ||
      a.player.name.localeCompare(b.player.name, "es")
  );

  // Los que empatan en puntos comparten posicion (1, 1, 3, 3, 5...).
  let lastPoints: number | null = null;
  let lastPosition = 0;
  let tier = -1;
  return sorted.map((row, index) => {
    const tied = row.points === lastPoints;
    const position = tied ? lastPosition : index + 1;
    if (!tied) tier += 1;
    lastPoints = row.points;
    lastPosition = position;
    return { ...row, position, tier };
  });
}

/**
 * Argentina esta en UTC-3 todo el año (no usa horario de verano).
 * La temporada se calcula siempre con este huso, y no con el del servidor,
 * para que el corte de fin de año sea el mismo corriendo en local o en Vercel
 * (que corre en UTC).
 */
const ARGENTINA_UTC_OFFSET_HOURS = 3;

/** Temporada (año) a la que pertenece un torneo, en hora argentina. */
export function seasonOf(date: Date): number {
  const local = new Date(
    date.getTime() - ARGENTINA_UTC_OFFSET_HOURS * 60 * 60 * 1000
  );
  return local.getUTCFullYear();
}

/** Rango de fechas de una temporada, para filtrar torneos en la base. */
export function seasonRange(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, 0, 1, ARGENTINA_UTC_OFFSET_HOURS)),
    lt: new Date(Date.UTC(year + 1, 0, 1, ARGENTINA_UTC_OFFSET_HOURS)),
  };
}
