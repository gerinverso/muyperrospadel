import { shuffle } from "@/lib/shuffle";

export type BracketSlot = {
  round: number;
  slot: number;
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
};

/**
 * Estado de un cruce mirado desde la ronda siguiente: si ya se sabe quién
 * avanza (`decided`) y quién es (`advancing`, null cuando de ese lado del
 * cuadro no hay nadie).
 */
type Resolved = { decided: boolean; advancing: string | null };

/**
 * Arma todos los slots del cuadro a partir de las posiciones ya definidas
 * (0-based) de la primera ronda.
 *
 * Resuelve los pases libres en TODAS las rondas de una sola pasada: si a un
 * cruce le falta el rival porque del otro lado del cuadro no puede haber nadie,
 * la pareja que está sola gana ese cruce y queda ya ubicada en la ronda
 * siguiente. Así el cuadro nunca se queda trabado esperando un rival que no
 * existe, sin importar cuántas parejas haya ni si son pares o impares.
 */
function buildBracketSlots(firstRoundPositions: (string | null)[]): BracketSlot[] {
  const bracketSize = firstRoundPositions.length;
  const totalRounds = Math.log2(bracketSize);
  const slots: BracketSlot[] = [];

  let previous: Resolved[] = [];
  for (let slot = 0; slot < bracketSize / 2; slot++) {
    const pairAId = firstRoundPositions[slot * 2] ?? null;
    const pairBId = firstRoundPositions[slot * 2 + 1] ?? null;
    const present = [pairAId, pairBId].filter((id): id is string => Boolean(id));
    // Con una sola pareja (o ninguna) el cruce ya está resuelto y no se juega.
    const winnerId = present.length === 1 ? present[0] : null;
    slots.push({ round: 1, slot, pairAId, pairBId, winnerId });
    previous.push({ decided: present.length <= 1, advancing: winnerId });
  }

  for (let round = 2; round <= totalRounds; round++) {
    const current: Resolved[] = [];
    const matchesInRound = bracketSize / 2 ** round;
    for (let slot = 0; slot < matchesInRound; slot++) {
      const feederA = previous[slot * 2];
      const feederB = previous[slot * 2 + 1];
      const pairAId = feederA.decided ? feederA.advancing : null;
      const pairBId = feederB.decided ? feederB.advancing : null;
      const present = [pairAId, pairBId].filter((id): id is string =>
        Boolean(id)
      );
      // Sólo se sabe el resultado si ya está definido lo que llega por los dos
      // lados y de uno de ellos no viene nadie.
      const decided = feederA.decided && feederB.decided && present.length <= 1;
      const winnerId = decided && present.length === 1 ? present[0] : null;
      slots.push({ round, slot, pairAId, pairBId, winnerId });
      current.push({ decided, advancing: winnerId });
    }
    previous = current;
  }

  return slots;
}

/**
 * Genera el cuadro de eliminación directa sorteando la ubicación de cada
 * pareja. Si la cantidad no es potencia de 2 se reparten pases libres al azar.
 * Es el camino de los torneos sin fase de grupos: no hay tabla previa, así que
 * no hay a quién darle el pase libre por mérito.
 */
export function generateBracket(pairIds: string[]): BracketSlot[] {
  if (pairIds.length < 2) {
    throw new Error("Se necesitan al menos 2 parejas para armar el cuadro");
  }

  const shuffledPairIds = shuffle(pairIds);
  const bracketSize = 2 ** Math.ceil(Math.log2(shuffledPairIds.length));
  const matchCount = bracketSize / 2;
  const byesNeeded = bracketSize - shuffledPairIds.length;

  // Los byes van en cruces DISTINTOS: si dos cayeran en el mismo, ese cruce
  // quedaría sin ninguna pareja. Siempre alcanza, porque la cantidad de byes es
  // menor a la de cruces.
  const byeMatches = new Set(
    shuffle(Array.from({ length: matchCount }, (_, i) => i)).slice(0, byesNeeded)
  );

  const firstRoundPositions: (string | null)[] = [];
  let nextPair = 0;
  for (let match = 0; match < matchCount; match++) {
    if (byeMatches.has(match)) {
      // Se sortea de qué lado del cruce queda el pase libre.
      const byeOnA = Math.random() < 0.5;
      firstRoundPositions.push(byeOnA ? null : shuffledPairIds[nextPair++]);
      firstRoundPositions.push(byeOnA ? shuffledPairIds[nextPair++] : null);
    } else {
      firstRoundPositions.push(shuffledPairIds[nextPair++]);
      firstRoundPositions.push(shuffledPairIds[nextPair++]);
    }
  }

  return buildBracketSlots(firstRoundPositions);
}

/** Arma la secuencia estándar de seeds (1-indexados) para un cuadro de
 * `size` posiciones (potencia de 2), de forma que el seed 1 y el último
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
 * Reacomoda la primera ronda para que no se cruzen dos parejas de la misma
 * zona. Intercambia rivales (el lado B de dos cruces) entre cruces reales:
 * nunca toca un pase libre, así el bye sigue quedando en las mejores parejas
 * como manda la siembra. Prefiere el cruce más cercano para alterar lo menos
 * posible el orden sembrado y, si no hay ningún intercambio que sirva, deja el
 * cruce como está (con muchos clasificados de pocas zonas es inevitable).
 */
function avoidSameZoneClashes(
  positions: (string | null)[],
  zoneOf: (pairId: string) => number | undefined
): void {
  const matchCount = positions.length / 2;
  const zoneAt = (i: number) => {
    const id = positions[i];
    return id ? zoneOf(id) : undefined;
  };
  const clashes = (match: number) => {
    const a = zoneAt(match * 2);
    const b = zoneAt(match * 2 + 1);
    return a !== undefined && a === b;
  };

  for (let i = 0; i < matchCount; i++) {
    if (!clashes(i)) continue;

    let best = -1;
    for (let j = 0; j < matchCount; j++) {
      if (j === i) continue;
      // Sólo entre cruces con las dos parejas presentes: mover un hueco
      // cambiaría a quién le toca el pase libre.
      if (!positions[j * 2] || !positions[j * 2 + 1]) continue;
      const zoneA = zoneAt(i * 2);
      const zoneB = zoneAt(i * 2 + 1);
      const otherA = zoneAt(j * 2);
      const otherB = zoneAt(j * 2 + 1);
      const fixesThis = zoneA === undefined || zoneA !== otherB;
      const keepsOther = otherA === undefined || otherA !== zoneB;
      if (fixesThis && keepsOther) {
        if (best === -1 || Math.abs(j - i) < Math.abs(best - i)) best = j;
      }
    }

    if (best !== -1) {
      const a = i * 2 + 1;
      const b = best * 2 + 1;
      [positions[a], positions[b]] = [positions[b], positions[a]];
    }
  }
}

/**
 * Genera el cuadro a partir de una lista de parejas YA ordenada por seed (mejor
 * ubicada primero), sin sortear nada. Se usa para el cuadro final de la fase de
 * grupos: los pases libres caen en los mejores seeds y, si se pasa `zoneOf`, se
 * evita que dos parejas de la misma zona se cruzen en la primera ronda.
 */
export function seedBracket(
  orderedPairIds: string[],
  zoneOf?: (pairId: string) => number | undefined
): BracketSlot[] {
  if (orderedPairIds.length < 2) {
    throw new Error("Se necesitan al menos 2 parejas para armar el cuadro");
  }

  const bracketSize = 2 ** Math.ceil(Math.log2(orderedPairIds.length));
  const seedPositions = standardSeedOrder(bracketSize);

  const firstRoundPositions: (string | null)[] = seedPositions.map((seed) =>
    seed <= orderedPairIds.length ? orderedPairIds[seed - 1] : null
  );

  if (zoneOf) avoidSameZoneClashes(firstRoundPositions, zoneOf);

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
