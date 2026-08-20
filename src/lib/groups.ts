import { shuffle } from "@/lib/shuffle";

/** Reparte parejas al azar en `groupsCount` zonas lo más parejas posible. */
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

/**
 * Tamaños que tendrían las zonas al repartir parejo, de mayor a menor. Sirve
 * para mostrar el reparto ("3-3-2") antes de armar nada.
 */
export function groupSizes(pairCount: number, groupsCount: number): number[] {
  if (groupsCount < 1) return [];
  const base = Math.floor(pairCount / groupsCount);
  const extra = pairCount % groupsCount;
  return Array.from({ length: groupsCount }, (_, i) =>
    i < extra ? base + 1 : base
  );
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
  /**
   * Partidos ganados contando SOLO los cruces contra las parejas que quedaron
   * empatadas en partidos ganados (mini-liga). Con dos parejas empatadas es
   * exactamente el enfrentamiento directo entre ellas.
   */
  tiebreakWins: number;
  /**
   * true si esta pareja sigue empatada con otra después de la mini-liga. Son
   * las únicas filas donde el orden manual del organizador cambia algo.
   */
  tied: boolean;
};

/**
 * Calcula la tabla de posiciones de una zona.
 *
 * Criterios, en orden: partidos ganados, mini-liga entre las empatadas
 * (enfrentamiento directo cuando son dos) y, si todavía siguen empatadas, el
 * orden manual que definió el organizador (`tiebreakOrder`). El id de pareja
 * cierra el desempate para que el resultado sea siempre el mismo.
 *
 * Los criterios se calculan como una clave por fila y no comparando de a dos:
 * un empate de tres o más con enfrentamientos cruzados hacía que el comparador
 * anterior fuera inconsistente y sort devolviera un orden arbitrario.
 */
export function computeGroupStandings(
  pairIds: string[],
  matches: GroupMatchResult[],
  tiebreakOrder: string[] = []
): StandingRow[] {
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const played = new Map<string, number>();
  pairIds.forEach((id) => {
    wins.set(id, 0);
    losses.set(id, 0);
    played.set(id, 0);
  });

  const decided = matches.filter(
    (m): m is { pairAId: string; pairBId: string; winnerId: string } =>
      Boolean(m.winnerId && m.pairAId && m.pairBId)
  );

  for (const m of decided) {
    const loserId = m.winnerId === m.pairAId ? m.pairBId : m.pairAId;
    if (wins.has(m.winnerId)) {
      wins.set(m.winnerId, wins.get(m.winnerId)! + 1);
      played.set(m.winnerId, played.get(m.winnerId)! + 1);
    }
    if (losses.has(loserId)) {
      losses.set(loserId, losses.get(loserId)! + 1);
      played.set(loserId, played.get(loserId)! + 1);
    }
  }

  // Mini-liga: para cada pareja, cuántos partidos ganó contra las que tienen
  // exactamente los mismos partidos ganados que ella.
  const tiebreakWins = new Map<string, number>();
  for (const id of pairIds) {
    const sameWins = new Set(
      pairIds.filter((other) => wins.get(other) === wins.get(id))
    );
    const count = decided.filter(
      (m) =>
        m.winnerId === id && sameWins.has(m.pairAId) && sameWins.has(m.pairBId)
    ).length;
    tiebreakWins.set(id, count);
  }

  const manualIndex = (id: string) => {
    const i = tiebreakOrder.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const rows: StandingRow[] = pairIds.map((id) => ({
    pairId: id,
    played: played.get(id)!,
    wins: wins.get(id)!,
    losses: losses.get(id)!,
    tiebreakWins: tiebreakWins.get(id)!,
    tied: pairIds.some(
      (other) =>
        other !== id &&
        wins.get(other) === wins.get(id) &&
        tiebreakWins.get(other) === tiebreakWins.get(id)
    ),
  }));

  return rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.tiebreakWins !== a.tiebreakWins) {
      return b.tiebreakWins - a.tiebreakWins;
    }
    const manual = manualIndex(a.pairId) - manualIndex(b.pairId);
    if (manual !== 0) return manual;
    return a.pairId < b.pairId ? -1 : a.pairId > b.pairId ? 1 : 0;
  });
}

/** Zona tal como la necesita el cálculo de clasificados. */
export type GroupLike = {
  id: string;
  index: number;
  pairIds: string[];
  matches: GroupMatchResult[];
  /** Clasificados propios de esta zona; null usa el número general del torneo. */
  qualifiers: number | null;
  tiebreakOrder: string[];
};

export type ZoneQualifiers = {
  groupId: string;
  groupIndex: number;
  /** Los que se pidieron (override de la zona o número general del torneo). */
  requested: number;
  /** Los que pasan de verdad: nunca más que la cantidad de parejas de la zona. */
  qualifiers: number;
  /** Los clasificados, en orden de tabla (1ro primero). */
  pairIds: string[];
  standings: StandingRow[];
};

/**
 * Resuelve quién pasa en cada zona.
 *
 * Cada zona puede tener su propio número de clasificados; si no lo tiene usa el
 * general del torneo. Si una zona quedó con menos parejas que clasificados
 * pedidos, pasan todas las que tenga (por eso `qualifiers` puede ser menor que
 * `requested`): así el torneo funciona igual con zonas de distinto tamaño.
 */
export function computeQualifiers(
  groups: GroupLike[],
  defaultQualifiers: number
): ZoneQualifiers[] {
  return groups.map((group) => {
    const standings = computeGroupStandings(
      group.pairIds,
      group.matches,
      group.tiebreakOrder
    );
    const requested = Math.max(1, group.qualifiers ?? defaultQualifiers);
    const qualifiers = Math.min(requested, standings.length);
    return {
      groupId: group.id,
      groupIndex: group.index,
      requested,
      qualifiers,
      pairIds: standings.slice(0, qualifiers).map((r) => r.pairId),
      standings,
    };
  });
}

export type SeededPair = { pairId: string; groupIndex: number };

/**
 * Ordena los clasificados para sembrar el cuadro: primero todos los 1ros,
 * después todos los 2dos, y así.
 *
 * Dentro de cada puesto rota el orden de las zonas (1ros: A, B, C; 2dos: B, C,
 * A). Con la siembra estándar eso manda al 1ro y al 2do de la misma zona a
 * mitades distintas del cuadro, así no se vuelven a cruzar de entrada.
 */
export function seedQualifiers(zones: ZoneQualifiers[]): SeededPair[] {
  if (zones.length === 0) return [];
  const maxRank = Math.max(...zones.map((z) => z.pairIds.length));
  const seeded: SeededPair[] = [];

  for (let rank = 0; rank < maxRank; rank++) {
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[(i + rank) % zones.length];
      const pairId = zone.pairIds[rank];
      if (pairId) seeded.push({ pairId, groupIndex: zone.groupIndex });
    }
  }

  return seeded;
}
