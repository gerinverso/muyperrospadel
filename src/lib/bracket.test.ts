import { describe, expect, it } from "vitest";
import {
  bracketPlan,
  forwardPath,
  generateBracket,
  isByeSlot,
  nextMatchPosition,
  roundSizes,
  seedBracket,
  totalRoundsFor,
  type BracketSlot,
} from "@/lib/bracket";

const key = (round: number, slot: number) => `${round}-${slot}`;
const pairs = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const present = (match: BracketSlot) =>
  [match.pairAId, match.pairBId].filter((id): id is string => Boolean(id));

/**
 * Juega el cuadro entero (gana siempre la pareja de arriba) y devuelve el
 * campeón y cuántos partidos se jugaron de verdad.
 *
 * Emula lo que hace el endpoint de resultados: al llegar una pareja a un cruce
 * que no puede tener rival, ese pase libre se resuelve solo. Si un cruce no se
 * puede resolver, tira error: así se comprueba que el cuadro nunca se traba.
 */
function playBracket(slots: BracketSlot[], pairCount: number) {
  const counts = roundSizes(pairCount);
  const board = new Map(slots.map((s) => [key(s.round, s.slot), { ...s }]));
  let played = 0;

  for (let round = 1; round <= counts.length; round++) {
    const inRound = [...board.values()]
      .filter((s) => s.round === round)
      .sort((a, b) => a.slot - b.slot);

    for (const match of inRound) {
      const here = present(match);
      const bye =
        round === 1 ? here.length === 1 : isByeSlot(round, match.slot, counts);
      let winner: string;

      if (bye) {
        // Pase libre: tiene que haber llegado exactamente una pareja y el
        // cuadro ya tiene que haberla dado por ganadora.
        expect(here).toHaveLength(1);
        expect(match.winnerId).toBe(here[0]);
        winner = here[0];
      } else {
        // Partido de verdad: las dos parejas y sin ganador puesto de antemano.
        expect(here).toHaveLength(2);
        expect(match.winnerId).toBeNull();
        winner = here[0];
        played++;
      }

      if (round === counts.length) return { champion: winner, played };

      const next = nextMatchPosition(round, match.slot);
      const target = board.get(key(next.round, next.slot))!;
      if (next.position === "A") {
        if (target.pairAId) expect(target.pairAId).toBe(winner);
        target.pairAId = winner;
      } else {
        if (target.pairBId) expect(target.pairBId).toBe(winner);
        target.pairBId = winner;
      }
      if (isByeSlot(next.round, next.slot, counts)) target.winnerId = winner;
    }
  }

  throw new Error("el cuadro no terminó en un campeón");
}

/** Invariantes que tiene que cumplir cualquier cuadro. */
function expectValidBracket(slots: BracketSlot[], pairCount: number) {
  const counts = roundSizes(pairCount);
  expect(slots).toHaveLength(counts.reduce((a, b) => a + b, 0));
  counts.forEach((count, i) => {
    expect(slots.filter((s) => s.round === i + 1)).toHaveLength(count);
  });

  const firstRound = slots.filter((s) => s.round === 1);
  const placed = firstRound.flatMap(present);
  expect(placed).toHaveLength(pairCount);
  expect(new Set(placed).size).toBe(pairCount);
  // Con parejas impares hay exactamente una que pasa libre en la primera ronda.
  expect(firstRound.filter((s) => present(s).length === 1)).toHaveLength(
    pairCount % 2
  );

  const { champion, played } = playBracket(slots, pairCount);
  expect(placed).toContain(champion);
  // Un cuadro de eliminación siempre define al campeón en n-1 partidos.
  expect(played).toBe(pairCount - 1);
}

describe("roundSizes", () => {
  it("empareja todo lo que puede en cada ronda", () => {
    expect(roundSizes(5)).toEqual([3, 2, 1]);
    expect(roundSizes(8)).toEqual([4, 2, 1]);
    expect(roundSizes(7)).toEqual([4, 2, 1]);
    expect(roundSizes(6)).toEqual([3, 2, 1]);
    expect(roundSizes(2)).toEqual([1]);
    expect(roundSizes(13)).toEqual([7, 4, 2, 1]);
  });

  it("la cantidad de rondas es la esperada", () => {
    for (let n = 2; n <= 40; n++) {
      expect(totalRoundsFor(n)).toBe(Math.ceil(Math.log2(n)));
    }
  });
});

describe("bracketPlan", () => {
  it("anticipa cómo arranca el cuadro", () => {
    expect(bracketPlan(5)).toMatchObject({
      firstRoundMatches: 2,
      firstRoundDirect: 1,
      totalMatches: 4,
      rounds: 3,
    });
    expect(bracketPlan(8)).toMatchObject({
      firstRoundMatches: 4,
      firstRoundDirect: 0,
      byes: 0,
    });
  });

  it("cuenta los pases libres de todo el cuadro", () => {
    // Con 5 parejas: una libre en la primera ronda y otra en la semifinal,
    // porque a la semi llegan 3.
    expect(bracketPlan(5).byes).toBe(2);
    expect(bracketPlan(7).byes).toBe(1);
  });
});

describe("seedBracket", () => {
  it("con 5 parejas arma 3 cruces: 2 partidos y la mejor pasa libre", () => {
    const slots = seedBracket(pairs(5));
    const r1 = slots.filter((s) => s.round === 1);
    expect(r1).toHaveLength(3);
    expect(r1.filter((s) => present(s).length === 2)).toHaveLength(2);
    const libre = r1.find((s) => present(s).length === 1)!;
    expect(libre.pairAId).toBe("p1");
    expect(libre.winnerId).toBe("p1");
    expectValidBracket(slots, 5);
  });

  it("con 5 parejas la mejor queda esperando en la semifinal", () => {
    const slots = seedBracket(pairs(5));
    const semis = slots.filter((s) => s.round === 2);
    expect(semis).toHaveLength(2);
    expect(semis[0]).toMatchObject({ pairAId: "p1", pairBId: null });
    // A la semi llegan 3, así que del otro lado hay un pase libre a la final.
    expect(isByeSlot(2, 1, roundSizes(5))).toBe(true);
    expect(isByeSlot(2, 0, roundSizes(5))).toBe(false);
  });

  it("con 8 parejas son 4 partidos y ningún pase libre", () => {
    const slots = seedBracket(pairs(8));
    const r1 = slots.filter((s) => s.round === 1);
    expect(r1).toHaveLength(4);
    expect(r1.every((s) => present(s).length === 2)).toBe(true);
    expect(slots.filter((s) => s.winnerId)).toHaveLength(0);
    expectValidBracket(slots, 8);
  });

  it("cruza al mejor con el peor", () => {
    const r1 = seedBracket(pairs(8)).filter((s) => s.round === 1);
    expect([r1[0].pairAId, r1[0].pairBId]).toEqual(["p1", "p8"]);
    expect([r1[2].pairAId, r1[2].pairBId]).toEqual(["p2", "p7"]);
  });

  it("el pase libre de la primera ronda es siempre para la mejor", () => {
    for (let n = 3; n <= 33; n += 2) {
      const libre = seedBracket(pairs(n))
        .filter((s) => s.round === 1)
        .find((s) => present(s).length === 1)!;
      expect(libre.pairAId).toBe("p1");
    }
  });

  it("los dos mejores seeds sólo se pueden cruzar en la final", () => {
    for (let n = 4; n <= 33; n++) {
      const slots = seedBracket(pairs(n));
      const counts = roundSizes(n);
      // Mitad del cuadro en la que cae cada caja de la primera ronda: se sube
      // hasta la ronda que alimenta la final.
      const branchOf = (slot: number) => {
        let s = slot;
        for (let round = 1; round < counts.length - 1; round++) s = Math.floor(s / 2);
        return s;
      };
      const boxOf = (pairId: string) =>
        slots.find(
          (s) => s.round === 1 && (s.pairAId === pairId || s.pairBId === pairId)
        )!.slot;
      const finalRound = slots.filter((s) => s.round === counts.length);
      expect(finalRound).toHaveLength(1);
      // Los dos mejores siempre en mitades distintas del cuadro.
      expect(branchOf(boxOf("p1"))).not.toBe(branchOf(boxOf("p2")));
      expectValidBracket(slots, n);
    }
  });

  it("necesita al menos 2 parejas", () => {
    expect(() => seedBracket(["p1"])).toThrow(/al menos 2 parejas/);
  });
});

describe("seedBracket con zonas", () => {
  const zoneOf = (pairId: string) => Number(pairId[1]);
  const clashes = (slots: BracketSlot[]) =>
    slots.filter(
      (s) =>
        s.round === 1 &&
        s.pairAId &&
        s.pairBId &&
        zoneOf(s.pairAId) === zoneOf(s.pairBId)
    );

  it("no cruza dos parejas de la misma zona en primera ronda", () => {
    const seeded = ["z0p0", "z1p0", "z2p0", "z1p1", "z2p1", "z0p1"];
    const slots = seedBracket(seeded, zoneOf);
    expect(clashes(slots)).toEqual([]);
    expectValidBracket(slots, 6);
  });

  it("reacomoda los rivales cuando la siembra deja un cruce de la misma zona", () => {
    const seeded = ["z0p0", "z1p0", "z0p1", "z1p1", "z0p2", "z1p2"];
    const slots = seedBracket(seeded, zoneOf);
    expect(clashes(slots)).toEqual([]);
    expectValidBracket(slots, 6);
  });

  it("al reacomodar no le saca el pase libre a la mejor", () => {
    const seeded = ["z0p0", "z1p0", "z0p1", "z1p1", "z0p2"];
    const slots = seedBracket(seeded, zoneOf);
    const libre = slots.find((s) => s.round === 1 && present(s).length === 1)!;
    expect(libre.pairAId).toBe("z0p0");
    expect(clashes(slots)).toEqual([]);
  });

  it("con una sola zona no rompe nada (el cruce es inevitable)", () => {
    const slots = seedBracket(["z0p0", "z0p1", "z0p2", "z0p3"], zoneOf);
    expectValidBracket(slots, 4);
  });
});

describe("generateBracket", () => {
  it("sortea el cuadro y funciona con cualquier cantidad, par o impar", () => {
    for (let n = 2; n <= 33; n++) {
      expectValidBracket(generateBracket(pairs(n)), n);
    }
  });

  it("con 5 parejas son 2 partidos y una libre, sin cruces vacíos", () => {
    for (let i = 0; i < 20; i++) {
      const r1 = generateBracket(pairs(5)).filter((s) => s.round === 1);
      expect(r1).toHaveLength(3);
      expect(r1.filter((s) => present(s).length === 1)).toHaveLength(1);
      expect(r1.every((s) => present(s).length > 0)).toBe(true);
    }
  });

  it("respeta a quién le toca el pase libre si el organizador lo elige", () => {
    for (let i = 0; i < 20; i++) {
      const slots = generateBracket(pairs(7), "p5");
      const libre = slots.find((s) => s.round === 1 && present(s).length === 1)!;
      expect(libre.pairAId).toBe("p5");
      expect(libre.winnerId).toBe("p5");
    }
  });

  it("ignora un pase libre elegido que no está en el cuadro", () => {
    const slots = generateBracket(pairs(5), "no-existe");
    expect(slots.filter((s) => s.round === 1 && present(s).length === 1)).toHaveLength(1);
    expectValidBracket(slots, 5);
  });

  it("necesita al menos 2 parejas", () => {
    expect(() => generateBracket(["p1"])).toThrow(/al menos 2 parejas/);
  });
});

describe("isByeSlot", () => {
  it("marca el cruce que no puede tener rival", () => {
    const counts = roundSizes(5); // [3, 2, 1]
    expect(isByeSlot(1, 0, counts)).toBe(false);
    expect(isByeSlot(2, 0, counts)).toBe(false);
    expect(isByeSlot(2, 1, counts)).toBe(true);
    expect(isByeSlot(3, 0, counts)).toBe(false);
  });
});

describe("forwardPath", () => {
  it("sigue la cadena de un cruce hasta la final", () => {
    expect(forwardPath(1, 3, 3)).toEqual([
      { round: 2, slot: 1, position: "B" },
      { round: 3, slot: 0, position: "B" },
    ]);
  });

  it("desde la final no hay nada más adelante", () => {
    expect(forwardPath(3, 0, 3)).toEqual([]);
  });
});
