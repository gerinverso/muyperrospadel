/** Mezcla un arreglo in-place con Fisher-Yates y devuelve una copia. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Empareja jugadores al azar. Requiere una cantidad par de jugadores. */
export function drawPairs<T>(players: T[]): [T, T][] {
  if (players.length % 2 !== 0) {
    throw new Error("La cantidad de jugadores debe ser par para sortear parejas");
  }
  const shuffled = shuffle(players);
  const pairs: [T, T][] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

export type BracketSlot = {
  round: number;
  slot: number;
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
};

/** Arma los slots de un cuadro de eliminacion a partir de las posiciones ya
 * definidas (0-based) del primer round, completando las rondas siguientes
 * vacias hasta que se resuelvan las anteriores. */
function buildBracketSlots(firstRoundPositions: (string | null)[]): BracketSlot[] {
  const bracketSize = firstRoundPositions.length;
  const totalRounds = Math.log2(bracketSize);
  const slots: BracketSlot[] = [];
  const firstRoundMatches = bracketSize / 2;

  for (let slot = 0; slot < firstRoundMatches; slot++) {
    const pairAId = firstRoundPositions[slot * 2];
    const pairBId = firstRoundPositions[slot * 2 + 1];
    // Bye: si falta un integrante, el otro pasa directo de ronda.
    const winnerId =
      pairAId && !pairBId ? pairAId : !pairAId && pairBId ? pairBId : null;
    slots.push({ round: 1, slot, pairAId, pairBId, winnerId });
  }

  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / 2 ** round;
    for (let slot = 0; slot < matchesInRound; slot++) {
      slots.push({ round, slot, pairAId: null, pairBId: null, winnerId: null });
    }
  }

  return slots;
}

/**
 * Genera el cuadro completo de eliminacion directa a partir de una lista de
 * ids de pareja, sorteando al azar tanto las parejas como su ubicacion. Si la
 * cantidad de parejas no es potencia de 2, se completan "byes" (pases libres)
 * repartidos al azar.
 */
export function generateBracket(pairIds: string[]): BracketSlot[] {
  const shuffledPairIds = shuffle(pairIds);
  const totalRounds = Math.ceil(Math.log2(shuffledPairIds.length));
  const bracketSize = 2 ** totalRounds;
  const byesNeeded = bracketSize - shuffledPairIds.length;

  const firstRoundPositions: (string | null)[] = shuffle([
    ...shuffledPairIds,
    ...Array(byesNeeded).fill(null),
  ]);

  return buildBracketSlots(firstRoundPositions);
}

/** Arma la secuencia estandar de seeds (1-indexados) para un cuadro de
 * `size` posiciones (potencia de 2), de forma que el seed 1 y el ultimo
 * seed disponible se enfrenten en la primera ronda, evitando que los
 * primeros puestos se crucen antes de tiempo. */
function standardSeedOrder(size: number): number[] {
  let seeds = [1];
  while (seeds.length < size) {
    const n = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) next.push(s, n - s);
    seeds = next;
  }
  return seeds;
}

/**
 * Genera el cuadro de eliminacion directa a partir de una lista de parejas YA
 * ordenada por seed (mejor ubicada primero), sin sortear nada. Se usa para
 * armar el cuadro final a partir de los clasificados de la fase de grupos,
 * de forma que parejas del mismo grupo no se crucen en primera ronda cuando
 * es posible.
 */
export function seedBracket(orderedPairIds: string[]): BracketSlot[] {
  const totalRounds = Math.ceil(Math.log2(orderedPairIds.length));
  const bracketSize = 2 ** totalRounds;
  const seedPositions = standardSeedOrder(bracketSize);

  const firstRoundPositions: (string | null)[] = seedPositions.map((seed) =>
    seed <= orderedPairIds.length ? orderedPairIds[seed - 1] : null
  );

  return buildBracketSlots(firstRoundPositions);
}

export function totalRoundsFor(pairCount: number): number {
  return Math.ceil(Math.log2(pairCount));
}

/** Calcula en que partido de la ronda siguiente cae el ganador de round/slot. */
export function nextMatchPosition(
  round: number,
  slot: number
): { round: number; slot: number; position: "A" | "B" } {
  return {
    round: round + 1,
    slot: Math.floor(slot / 2),
    position: slot % 2 === 0 ? "A" : "B",
  };
}

/**
 * Devuelve la cadena de partidos hacia adelante (hacia la final) a los que
 * alimenta el partido en round/slot, con la posicion (A/B) que ocupa el
 * ganador en cada uno. Sirve para propagar o limpiar resultados cuando se
 * corrige el ganador de un partido ya jugado.
 */
export function forwardPath(
  round: number,
  slot: number,
  totalRounds: number
): { round: number; slot: number; position: "A" | "B" }[] {
  const steps: { round: number; slot: number; position: "A" | "B" }[] = [];
  let r = round;
  let s = slot;
  while (r < totalRounds) {
    const next = nextMatchPosition(r, s);
    steps.push(next);
    r = next.round;
    s = next.slot;
  }
  return steps;
}
