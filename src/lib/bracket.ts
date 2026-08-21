import { shuffle } from "@/lib/shuffle";

export type BracketSlot = {
  round: number;
  slot: number;
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
};

/**
 * Cantidad de cruces de cada ronda, de la primera a la final.
 *
 * Todos los pases libres se concentran en la primera ronda, para que de ahí en
 * adelante el cuadro sea exacto: los cuartos son 4 partidos, la semifinal 2 y
 * la final 1, sin que nadie pase de largo. La primera ronda tiene tantas cajas
 * como la potencia de 2 más grande que no pase la cantidad de parejas, y se
 * juegan sólo los partidos que hagan falta para llenarla.
 *
 * Con 7 parejas son 4 cajas (3 partidos y la mejor espera en la semifinal),
 * después 2 y después la final. Con 12 son 8 cajas (4 partidos y 4 libres),
 * después los 4 cuartos, las 2 semis y la final.
 */
export function roundSizes(pairCount: number): number[] {
  if (pairCount < 2) return [];

  let base = 1;
  while (base * 2 <= pairCount) base *= 2;

  // Si la cantidad ya es potencia de 2 no hace falta ronda de acomodo: la
  // primera ronda son directamente la mitad de las parejas.
  const sizes: number[] = [];
  for (let count = base === pairCount ? base / 2 : base; count >= 1; count /= 2) {
    sizes.push(count);
  }
  return sizes;
}

export function totalRoundsFor(pairCount: number): number {
  return roundSizes(pairCount).length;
}

/**
 * Orden en el que se le asignan las cajas de la primera ronda a las parejas
 * sembradas: primero la que le toca a la mejor, después al segundo seed, y así.
 *
 * Es la siembra clásica del cuadro (con 8 parejas: 1-8, 4-5, 3-6, 2-7). Se arma
 * duplicando el cuadro anterior: cada caja se abre en dos y la nueva se lleva
 * el seed que la completa hasta `cajas + 1`, alternando de qué lado cae para
 * que las dos mitades queden equilibradas. Al final se invierte la tabla para
 * saber qué caja le toca a cada seed.
 *
 * Así los mejores caen en mitades distintas y se cruzan lo más tarde posible, y
 * en cada instancia al que viene mejor sembrado le toca el rival más flojo de
 * los que quedan.
 */
function boxSeedOrder(boxCount: number): number[] {
  if (boxCount === 0) return [];

  // seedAt[caja] = qué seed (1 = mejor) va en esa caja.
  let seedAt = [1];
  while (seedAt.length < boxCount) {
    const size = seedAt.length * 2;
    seedAt = seedAt.flatMap((seed, box) =>
      box % 2 === 0 ? [seed, size + 1 - seed] : [size + 1 - seed, seed]
    );
  }

  const order: number[] = [];
  seedAt.forEach((seed, box) => {
    order[seed - 1] = box;
  });
  return order;
}

/**
 * Reparte las parejas (ya ordenadas por seed, mejor primero) en las cajas de la
 * primera ronda.
 *
 * Las cajas que sobran para completar la potencia de 2 son los pases libres y
 * van para los mejores seeds, en las cajas de más prioridad. Las demás parejas
 * se cruzan mejor contra peor.
 */
function layoutFirstRound(orderedPairIds: string[]): string[][] {
  const boxCount = roundSizes(orderedPairIds.length)[0];
  const boxes: string[][] = Array.from({ length: boxCount }, () => []);
  const priority = boxSeedOrder(boxCount);
  const rest = [...orderedPairIds];
  const byes = boxCount * 2 - orderedPairIds.length;

  for (let i = 0; i < byes; i++) {
    boxes[priority[i]] = [rest.shift()!];
  }
  for (const box of priority) {
    if (boxes[box].length > 0) continue;
    boxes[box] = [rest.shift()!, rest.pop()!];
  }

  return boxes;
}

/**
 * Reacomoda la primera ronda para que no se cruzen dos parejas de la misma
 * zona. Intercambia rivales entre cruces reales (nunca toca las cajas de los
 * pases libres, así las mejores los conservan) y prefiere el cruce más cercano para
 * alterar lo menos posible la siembra. Si no hay ningún intercambio que sirva
 * deja el cruce como está: con muchos clasificados de pocas zonas es inevitable.
 */
function avoidSameZoneClashes(
  boxes: string[][],
  zoneOf: (pairId: string) => number | undefined
): void {
  const clashes = (box: string[]) =>
    box.length === 2 &&
    zoneOf(box[0]) !== undefined &&
    zoneOf(box[0]) === zoneOf(box[1]);

  for (let i = 0; i < boxes.length; i++) {
    if (!clashes(boxes[i])) continue;

    let best = -1;
    for (let j = 0; j < boxes.length; j++) {
      if (j === i || boxes[j].length !== 2) continue;
      const fixesThis = zoneOf(boxes[i][0]) !== zoneOf(boxes[j][1]);
      const keepsOther = zoneOf(boxes[j][0]) !== zoneOf(boxes[i][1]);
      if (fixesThis && keepsOther) {
        if (best === -1 || Math.abs(j - i) < Math.abs(best - i)) best = j;
      }
    }

    if (best !== -1) {
      [boxes[i][1], boxes[best][1]] = [boxes[best][1], boxes[i][1]];
    }
  }
}

/**
 * Arma todos los cruces del cuadro a partir de las cajas de la primera ronda.
 *
 * Las cajas de la primera ronda con una sola pareja son los pases libres: se
 * resuelven de entrada y la pareja queda ya ubicada en la ronda siguiente. De
 * la segunda ronda en adelante cada cruce se alimenta de dos cruces anteriores,
 * así que siempre se juega y arranca sin ganador.
 */
function buildBracketSlots(boxes: string[][]): BracketSlot[] {
  const slots: BracketSlot[] = [];

  // Pareja que ya tiene lugar en la ronda siguiente, por caja. null mientras el
  // cruce no esté definido.
  let advancing: (string | null)[] = boxes.map((box, slot) => {
    const [pairAId = null, pairBId = null] = box;
    const plays = box.length === 2;
    slots.push({
      round: 1,
      slot,
      pairAId,
      pairBId,
      winnerId: plays ? null : pairAId,
    });
    return plays ? null : pairAId;
  });

  const counts = roundSizes(boxes.reduce((total, box) => total + box.length, 0));
  for (let round = 2; round <= counts.length; round++) {
    const next: (string | null)[] = [];
    for (let slot = 0; slot < counts[round - 1]; slot++) {
      slots.push({
        round,
        slot,
        pairAId: advancing[slot * 2],
        pairBId: advancing[slot * 2 + 1],
        winnerId: null,
      });
      next.push(null);
    }
    advancing = next;
  }

  return slots;
}

/**
 * Cómo queda un cuadro de `pairCount` parejas, para poder anunciarlo antes de
 * armarlo: cuántos partidos se juegan en la primera ronda, cuántas parejas
 * pasan libres ahí y cuántos partidos tiene el cuadro en total.
 *
 * `byes` y `firstRoundDirect` son lo mismo: todos los pases libres del cuadro
 * están en la primera ronda.
 */
export function bracketPlan(pairCount: number): {
  rounds: number;
  firstRoundMatches: number;
  firstRoundDirect: number;
  totalMatches: number;
  byes: number;
} {
  const counts = roundSizes(pairCount);
  const firstRoundBoxes = counts[0] ?? 0;
  // Cajas de la primera ronda que quedan con una sola pareja.
  const byes = Math.max(0, firstRoundBoxes * 2 - pairCount);
  return {
    rounds: counts.length,
    firstRoundMatches: firstRoundBoxes - byes,
    firstRoundDirect: byes,
    totalMatches: Math.max(0, pairCount - 1),
    byes,
  };
}

/**
 * Genera el cuadro sorteando la ubicación de cada pareja. Es el camino de los
 * torneos sin fase de grupos: no hay tabla previa, así que los pases libres se
 * sortean, salvo que el organizador elija con `byePairId` a una pareja que sí
 * se lleve uno.
 */
export function generateBracket(
  pairIds: string[],
  byePairId?: string | null
): BracketSlot[] {
  if (pairIds.length < 2) {
    throw new Error("Se necesitan al menos 2 parejas para armar el cuadro");
  }

  const shuffled = shuffle(pairIds);
  // Las primeras de la lista son las que se llevan los pases libres.
  if (byePairId && shuffled.includes(byePairId)) {
    shuffled.splice(shuffled.indexOf(byePairId), 1);
    shuffled.unshift(byePairId);
  }

  return buildBracketSlots(layoutFirstRound(shuffled));
}

/**
 * Genera el cuadro a partir de una lista de parejas YA ordenada por seed (mejor
 * primero), sin sortear nada. Se usa para el cuadro final de la fase de grupos:
 * los pases libres de la primera ronda son para las mejores de la tabla y, si
 * se pasa `zoneOf`, se evita que dos parejas de la misma zona se cruzen ahí.
 */
export function seedBracket(
  orderedPairIds: string[],
  zoneOf?: (pairId: string) => number | undefined
): BracketSlot[] {
  if (orderedPairIds.length < 2) {
    throw new Error("Se necesitan al menos 2 parejas para armar el cuadro");
  }

  const boxes = layoutFirstRound(orderedPairIds);
  if (zoneOf) avoidSameZoneClashes(boxes, zoneOf);

  return buildBracketSlots(boxes);
}

/** Calcula en qué cruce de la ronda siguiente cae el ganador de round/slot. */
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
 * Devuelve la cadena de cruces hacia adelante (hacia la final) a los que
 * alimenta el cruce en round/slot, con la posición (A/B) que ocupa el ganador
 * en cada uno. Sirve para propagar o limpiar resultados cuando se corrige el
 * ganador de un partido ya jugado.
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
