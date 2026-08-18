import { shuffle } from "@/lib/bracket";

/** Reparte parejas al azar en `groupsCount` zonas lo mas parejas posible. */
export function distributeGroups<T>(items: T[], groupsCount: number): T[][] {
  if (groupsCount < 1) {
    throw new Error("La cantidad de zonas debe ser al menos 1");
  }
  const shuffled = shuffle(items);
  const groups: T[][] = Array.from({ length: groupsCount }, () => []);
  shuffled.forEach((item, i) => {
    groups[i % groupsCount].push(item);
  });
  return groups;
}

/** Todos los enfrentamientos posibles (todos contra todos, una vez) de una zona. */
export function roundRobinMatches<T>(items: T[]): [T, T][] {
  const matches: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      matches.push([items[i], items[j]]);
    }
  }
  return matches;
}

export type GroupMatchResult = {
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
};

type MatchLike = {
  pairA?: { id: string } | null;
  pairB?: { id: string } | null;
  winner?: { id: string } | null;
};

/** Adapta partidos con objetos de pareja anidados (como los que devuelve la
 * API) al formato plano que espera `computeGroupStandings`. */
export function toGroupMatchResults(matches: MatchLike[]): GroupMatchResult[] {
  return matches.map((m) => ({
    pairAId: m.pairA?.id ?? null,
    pairBId: m.pairB?.id ?? null,
    winnerId: m.winner?.id ?? null,
  }));
}

export type StandingRow = {
  pairId: string;
  played: number;
  wins: number;
  losses: number;
};

/**
 * Calcula la tabla de posiciones de una zona: ordenada por partidos ganados
 * (descendente) y, ante empate entre dos parejas, por resultado del
 * enfrentamiento directo entre ellas si ya se jugo.
 */
export function computeGroupStandings(
  pairIds: string[],
  matches: GroupMatchResult[]
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  pairIds.forEach((id) => rows.set(id, { pairId: id, played: 0, wins: 0, losses: 0 }));

  for (const m of matches) {
    if (!m.winnerId || !m.pairAId || !m.pairBId) continue;
    const loserId = m.winnerId === m.pairAId ? m.pairBId : m.pairAId;
    const winnerRow = rows.get(m.winnerId);
    const loserRow = rows.get(loserId);
    if (winnerRow) {
      winnerRow.wins += 1;
      winnerRow.played += 1;
    }
    if (loserRow) {
      loserRow.losses += 1;
      loserRow.played += 1;
    }
  }

  function headToHead(a: string, b: string): number {
    const match = matches.find(
      (m) =>
        m.winnerId &&
        ((m.pairAId === a && m.pairBId === b) ||
          (m.pairAId === b && m.pairBId === a))
    );
    if (!match) return 0;
    return match.winnerId === a ? -1 : 1;
  }

  return [...rows.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return headToHead(a.pairId, b.pairId);
  });
}
