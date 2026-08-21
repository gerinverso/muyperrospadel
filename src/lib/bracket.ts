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
 * El cuadro no se rellena hasta la potencia de 2 más cercana: en cada ronda se
 * emparejan todas las parejas que se puedan y la que sobra (si son impares)
 * pasa libre. Con 5 parejas son 3 cruces (2 partidos y una libre), después 2 y
 * después la final.
 */
export function roundSizes(pairCount: number): number[] {
  const sizes: number[] = [];
  let remaining = pairCount;
  while (remaining > 1) {
    remaining = Math.ceil(remaining / 2);
    sizes.push(remaining);
  }
  return sizes;
}

export function totalRoundsFor(pairCount: number): number {
  return roundSizes(pairCount).length;
}

/**
 * Un cruce es un pase libre cuando estructuralmente no puede tener rival: la
 * ronda anterior no tiene un segundo cruce que le alimente el otro lado. La
 * pareja que llega ahí avanza sin jugar.
 *
 * `roundCounts` es la cantidad de cruces por ronda (`roundSizes`).
 */
export function isByeSlot(
  round: number,
  slot: number,
  roundCounts: number[]
): boolean {
  if (round <= 1) return false;
  return slot * 2 + 1 >= roundCounts[round - 2];
}

/**
 * Orden en el que se le asignan las cajas de la primera ronda a las parejas
 * sembradas: primero la que le toca a la mejor, después al segundo seed, y así.
 *
 * Se arma el árbol de cruces (cada caja alimenta la caja `floor(slot / 2)` de
 * la ronda siguiente) y se recorre alternando ramas, de modo que los mejores
 * seeds caigan en mitades distintas del cuadro y se cruzen lo más tarde
 * posible.
 */
function boxSeedOrder(boxCount: number): number[] {
  type Node = number | { a: Node; b?: Node };

  let level: Node[] = Array.from({ length: boxCount }, (_, i) => i);
  while (level.length > 1) {
    const next: Node[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push({ a: level[i], b: level[i + 1] });
    }
    level = next;
  }

  const order = (node: Node): number[] => {
    if (typeof node === "number") return [node];
    const first = order(node.a);
    const second = node.b === undefined ? [] : order(node.b);
    const merged: number[] = [];
    for (let i = 0; i < Math.max(first.length, second.length); i++) {
      if (i < first.length) merged.push(first[i]);
      if (i < second.length) merged.push(second[i]);
    }
    return merged;
  };

  return boxCount === 0 ? [] : order(level[0]);
}

/**
 * Reparte las parejas (ya ordenadas por seed, mejor primero) en las cajas de la
 * primera ronda.
 *
 * Si son impares, la mejor pareja se queda sola en su caja y pasa libre. Las
 * demás se cruzan mejor contra peor, empezando por las cajas de más prioridad.
 */
function layoutFirstRound(orderedPairIds: string[]): string[][] {
  const boxCount = Math.ceil(orderedPairIds.length / 2);
  const boxes: string[][] = Array.from({ length: boxCount }, () => []);
  const priority = boxSeedOrder(boxCount);
  const rest = [...orderedPairIds];

  if (rest.length % 2 === 1) {
    boxes[priority[0]] = [rest.shift()!];
  }
  for (const box of priority) {
    if (boxes[box].length > 0) continue;
    boxes[box] = [rest.shift()!, rest.pop()!];
  }

  return boxes;
}

/**
 * Reacomoda la primera ronda para que no se cruzen dos parejas de la misma
 * zona. Intercambia rivales entre cruces reales (nunca toca la caja del pase
 * libre, así la mejor pareja lo conserva) y prefiere el cruce más cercano para
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

/** Estado de un cruce visto desde la ronda siguiente. */
type Resolved = {
  /** false cuando es un pase libre: nadie puede venir del otro lado. */
  plays: boolean;
  /** La pareja que avanza, si ya se sabe. */
  advancing: string | null;
};

/**
 * Arma todos los cruces del cuadro a partir de las cajas de la primera ronda.
 *
 * Los pases libres se resuelven solos: si a una caja no le puede llegar rival,
 * la pareja que está ahí gana ese cruce y queda ya ubicada en la ronda
 * siguiente. Cuando el pase libre es de una ronda posterior todavía no se sabe
 * quién va a llegar, así que la caja queda vacía y la resuelve el endpoint que
 * carga los resultados en cuanto se define el partido que la alimenta.
 */
function buildBracketSlots(boxes: string[][]): BracketSlot[] {
  const slots: BracketSlot[] = [];

  let previous: Resolved[] = boxes.map((box, slot) => {
    const [pairAId = null, pairBId = null] = box;
    const plays = box.length === 2;
    slots.push({
      round: 1,
      slot,
      pairAId,
      pairBId,
      winnerId: plays ? null : pairAId,
    });
    return { plays, advancing: plays ? null : pairAId };
  });

  const counts = roundSizes(boxes.reduce((total, box) => total + box.length, 0));
  for (let round = 2; round <= counts.length; round++) {
    const current: Resolved[] = [];
    for (let slot = 0; slot < counts[round - 1]; slot++) {
      const feederA = previous[slot * 2];
      const feederB = previous[slot * 2 + 1];
      const pairAId = feederA?.advancing ?? null;
      const pairBId = feederB?.advancing ?? null;
      // Sin segundo alimentador el cruce es un pase libre.
      const plays = feederB !== undefined;
      slots.push({
        round,
        slot,
        pairAId,
        pairBId,
        winnerId: plays ? null : pairAId,
      });
      current.push({ plays, advancing: plays ? null : pairAId });
    }
    previous = current;
  }

  return slots;
}

/**
 * Cómo queda un cuadro de `pairCount` parejas, para poder anunciarlo antes de
 * armarlo: cuántos partidos se juegan en la primera ronda, si alguna pareja
 * pasa libre, cuántos partidos tiene en total y cuántos pases libres hay
 * sumando todas las rondas.
 */
export function bracketPlan(pairCount: number): {
  rounds: number;
  firstRoundMatches: number;
  firstRoundDirect: number;
  totalMatches: number;
  byes: number;
} {
  const counts = roundSizes(pairCount);
  const boxes = counts.reduce((total, count) => total + count, 0);
  const totalMatches = Math.max(0, pairCount - 1);
  return {
    rounds: counts.length,
    firstRoundMatches: Math.floor(pairCount / 2),
    firstRoundDirect: pairCount % 2,
    totalMatches,
    byes: boxes - totalMatches,
  };
}

/**
 * Genera el cuadro sorteando la ubicación de cada pareja. Es el camino de los
 * torneos sin fase de grupos: no hay tabla previa, así que si son impares el
 * pase libre se sortea, salvo que el organizador elija a quién le toca con
 * `byePairId`.
 */
export function generateBracket(
  pairIds: string[],
  byePairId?: string | null
): BracketSlot[] {
  if (pairIds.length < 2) {
    throw new Error("Se necesitan al menos 2 parejas para armar el cuadro");
  }

  const shuffled = shuffle(pairIds);
  // La primera de la lista es la que se queda sola cuando son impares.
  if (byePairId && shuffled.includes(byePairId)) {
    shuffled.splice(shuffled.indexOf(byePairId), 1);
    shuffled.unshift(byePairId);
  }

  return buildBracketSlots(layoutFirstRound(shuffled));
}

/**
 * Genera el cuadro a partir de una lista de parejas YA ordenada por seed (mejor
 * primero), sin sortear nada. Se usa para el cuadro final de la fase de grupos:
 * si son impares el pase libre es para la mejor y, si se pasa `zoneOf`, se
 * evita que dos parejas de la misma zona se cruzen en la primera ronda.
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
