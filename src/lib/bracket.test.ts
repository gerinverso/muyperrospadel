import { describe, expect, it } from "vitest";
import {
  forwardPath,
  generateBracket,
  nextMatchPosition,
  seedBracket,
  totalRoundsFor,
  type BracketSlot,
} from "@/lib/bracket";

const key = (round: number, slot: number) => `${round}-${slot}`;
const pairs = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/**
 * Juega el cuadro completo (gana siempre la pareja de arriba) y devuelve el
 * campeón. Tira error si algún cruce no se puede resolver: es la forma de
 * comprobar que el cuadro nunca queda trabado esperando un rival que no existe.
 *
 * También verifica que lo que el cuadro trajo pre-cargado (los pases libres ya
 * ubicados en la ronda siguiente) coincida con lo que sale de jugarlo.
 */
function playBracket(slots: BracketSlot[]): string {
  const board = new Map(slots.map((s) => [key(s.round, s.slot), { ...s }]));
  const totalRounds = Math.max(...slots.map((s) => s.round));
  let champion: string | null = null;

  for (let round = 1; round <= totalRounds; round++) {
    const inRound = [...board.values()]
      .filter((s) => s.round === round)
      .sort((a, b) => a.slot - b.slot);

    for (const match of inRound) {
      const present = [match.pairAId, match.pairBId].filter(
        (id): id is string => Boolean(id)
      );
      let winner: string;
      if (present.length === 2) {
        // Un cruce que se juega de verdad no puede venir con ganador puesto.
        expect(match.winnerId).toBeNull();
        winner = present[0];
      } else if (present.length === 1) {
        // Pase libre: el cuadro ya tiene que haberlo resuelto solo.
        expect(match.winnerId).toBe(present[0]);
        winner = present[0];
      } else {
        throw new Error(`cruce vacío en ronda ${round}, slot ${match.slot}`);
      }

      if (round === totalRounds) {
        champion = winner;
        continue;
      }
      const next = nextMatchPosition(round, match.slot);
      const target = board.get(key(next.round, next.slot))!;
      if (next.position === "A") {
        if (target.pairAId) expect(target.pairAId).toBe(winner);
        target.pairAId = winner;
      } else {
        if (target.pairBId) expect(target.pairBId).toBe(winner);
        target.pairBId = winner;
      }
    }
  }

  if (!champion) throw new Error("el cuadro no terminó en un campeón");
  return champion;
}

/** Comprueba las invariantes que tiene que cumplir cualquier cuadro. */
function expectValidBracket(slots: BracketSlot[], pairCount: number) {
  const totalRounds = totalRoundsFor(pairCount);
  const bracketSize = 2 ** totalRounds;

  expect(Math.max(...slots.map((s) => s.round))).toBe(totalRounds);
  expect(slots).toHaveLength(bracketSize - 1);

  const firstRound = slots.filter((s) => s.round === 1);
  expect(firstRound).toHaveLength(bracketSize / 2);

  // Cada pareja aparece exactamente una vez en la primera ronda.
  const placed = firstRound.flatMap((s) =>
    [s.pairAId, s.pairBId].filter((id): id is string => Boolean(id))
  );
  expect(placed).toHaveLength(pairCount);
  expect(new Set(placed).size).toBe(pairCount);

  // Ningún cruce de primera ronda puede quedar sin nadie.
  for (const match of firstRound) {
    expect(Boolean(match.pairAId || match.pairBId)).toBe(true);
  }

  // Y el cuadro se puede jugar de punta a punta.
  expect(placed).toContain(playBracket(slots));
}

describe("seedBracket", () => {
  it("con 4 clasificados arma 2 cruces y la final, sin pases libres", () => {
    const slots = seedBracket(pairs(4));
    expect(slots).toHaveLength(3);
    expect(slots.filter((s) => s.winnerId)).toHaveLength(0);
    expectValidBracket(slots, 4);
  });

  it("cruza al mejor con el peor seed", () => {
    const slots = seedBracket(["a", "b", "c", "d"]);
    const first = slots.filter((s) => s.round === 1);
    expect([first[0].pairAId, first[0].pairBId]).toEqual(["a", "d"]);
    expect([first[1].pairAId, first[1].pairBId]).toEqual(["b", "c"]);
  });

  it("le da los pases libres a los mejores clasificados", () => {
    // 5 clasificados en un cuadro de 8: los 3 primeros pasan sin jugar.
    const slots = seedBracket(pairs(5));
    const byes = slots
      .filter((s) => s.round === 1 && s.winnerId)
      .map((s) => s.winnerId);
    expect(byes.sort()).toEqual(["p1", "p2", "p3"]);
    expectValidBracket(slots, 5);
  });

  it("deja al que pasa libre ya ubicado en la ronda siguiente", () => {
    const slots = seedBracket(pairs(5));
    const secondRound = slots.filter((s) => s.round === 2);
    // p1 pasó libre y espera al ganador del único cruce real.
    expect(secondRound[0]).toMatchObject({ pairAId: "p1", pairBId: null });
    // p2 y p3 pasaron libres los dos: su cruce ya es un partido de verdad.
    expect(secondRound[1]).toMatchObject({
      pairAId: "p2",
      pairBId: "p3",
      winnerId: null,
    });
  });

  it("con 3 clasificados el que pasa libre queda esperando en la final", () => {
    const slots = seedBracket(pairs(3));
    expect(slots).toHaveLength(3);
    const final = slots.find((s) => s.round === 2)!;
    expect(final).toMatchObject({ pairAId: "p1", pairBId: null, winnerId: null });
    expectValidBracket(slots, 3);
  });

  it("con 2 clasificados es una sola final", () => {
    const slots = seedBracket(pairs(2));
    expect(slots).toEqual([
      { round: 1, slot: 0, pairAId: "p1", pairBId: "p2", winnerId: null },
    ]);
  });

  it("funciona con cualquier cantidad de clasificados, par o impar", () => {
    for (let n = 2; n <= 33; n++) {
      expectValidBracket(seedBracket(pairs(n)), n);
    }
  });

  it("necesita al menos 2 parejas", () => {
    expect(() => seedBracket(["p1"])).toThrow(/al menos 2 parejas/);
  });
});

describe("seedBracket con zonas", () => {
  /** Zona de cada pareja a partir del nombre "zNpM". */
  const zoneOf = (pairId: string) => Number(pairId[1]);
  const sameZoneClashes = (slots: BracketSlot[]) =>
    slots.filter(
      (s) =>
        s.round === 1 &&
        s.pairAId &&
        s.pairBId &&
        zoneOf(s.pairAId) === zoneOf(s.pairBId)
    );

  it("no cruza dos parejas de la misma zona en primera ronda (3 zonas, 2 pasan)", () => {
    // Orden sembrado: 1ros de A, B, C y despues los 2dos rotados.
    const seeded = ["z0p0", "z1p0", "z2p0", "z1p1", "z2p1", "z0p1"];
    const slots = seedBracket(seeded, zoneOf);
    expect(sameZoneClashes(slots)).toEqual([]);
    expectValidBracket(slots, 6);
  });

  it("reacomoda los rivales cuando la siembra deja un cruce de la misma zona", () => {
    // 2 zonas y 3 clasificados por zona: sin reacomodar, los 2dos y 3ros de
    // cada zona se cruzarian entre ellos en la primera ronda.
    const seeded = ["z0p0", "z1p0", "z1p1", "z0p1", "z0p2", "z1p2"];
    expect(sameZoneClashes(seedBracket(seeded))).toHaveLength(2);

    const slots = seedBracket(seeded, zoneOf);
    expect(sameZoneClashes(slots)).toEqual([]);
    expectValidBracket(slots, 6);
  });

  it("al reacomodar no le saca el pase libre a los mejores", () => {
    const seeded = ["z0p0", "z1p0", "z1p1", "z0p1", "z0p2", "z1p2"];
    const byes = seedBracket(seeded, zoneOf)
      .filter((s) => s.round === 1 && s.winnerId)
      .map((s) => s.winnerId);
    expect(byes.sort()).toEqual(["z0p0", "z1p0"]);
  });

  it("no rompe nada cuando hay una sola zona (no se puede evitar el cruce)", () => {
    const seeded = ["z0p0", "z0p1", "z0p2", "z0p3"];
    const slots = seedBracket(seeded, zoneOf);
    expectValidBracket(slots, 4);
  });
});

describe("generateBracket", () => {
  it("sortea el cuadro y funciona con cualquier cantidad, par o impar", () => {
    for (let n = 2; n <= 20; n++) {
      expectValidBracket(generateBracket(pairs(n)), n);
    }
  });

  it("reparte los pases libres necesarios en cruces distintos", () => {
    // 5 parejas en un cuadro de 8: 3 pases libres, cada uno en su cruce.
    for (let i = 0; i < 20; i++) {
      const slots = generateBracket(pairs(5));
      const first = slots.filter((s) => s.round === 1);
      expect(first.filter((s) => s.winnerId)).toHaveLength(3);
      expect(first.filter((s) => !s.pairAId && !s.pairBId)).toEqual([]);
    }
  });

  it("necesita al menos 2 parejas", () => {
    expect(() => generateBracket(["p1"])).toThrow(/al menos 2 parejas/);
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
