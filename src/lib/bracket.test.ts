import { describe, expect, it } from "vitest";
import {
  bracketPlan,
  forwardPath,
  generateBracket,
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
 * Los pases libres sólo existen en la primera ronda y vienen ya resueltos. De
 * la segunda ronda en adelante todo cruce tiene que tener dos parejas: si
 * alguno queda a medias, el test falla.
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
      const bye = round === 1 && here.length === 1;
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

  // De la segunda ronda en adelante el cuadro es exacto: cada ronda es la mitad
  // de la anterior, así que ningún cruce puede quedarse sin rival. Nunca más un
  // pase libre en cuartos, semifinal o final.
  for (let round = 2; round <= counts.length; round++) {
    expect(counts[round - 1] * 2).toBe(counts[round - 2]);
  }
  expect(slots.filter((s) => s.round > 1 && s.winnerId)).toHaveLength(0);

  const firstRound = slots.filter((s) => s.round === 1);
  const placed = firstRound.flatMap(present);
  expect(placed).toHaveLength(pairCount);
  expect(new Set(placed).size).toBe(pairCount);
  // Todos los pases libres del cuadro están en la primera ronda: son las cajas
  // que quedan sin ocupar al completar la potencia de 2.
  expect(firstRound.filter((s) => present(s).length === 1)).toHaveLength(
    counts[0] * 2 - pairCount
  );

  const { champion, played } = playBracket(slots, pairCount);
  expect(placed).toContain(champion);
  // Un cuadro de eliminación siempre define al campeón en n-1 partidos.
  expect(played).toBe(pairCount - 1);
}

describe("roundSizes", () => {
  it("la primera ronda deja una potencia de 2 y de ahí es exacto", () => {
    expect(roundSizes(2)).toEqual([1]);
    expect(roundSizes(3)).toEqual([2, 1]);
    expect(roundSizes(4)).toEqual([2, 1]);
    // Con 5, 6 o 7 la primera ronda son 4 cajas: se juega lo que haga falta
    // para dejar 4 en semifinal.
    expect(roundSizes(5)).toEqual([4, 2, 1]);
    expect(roundSizes(6)).toEqual([4, 2, 1]);
    expect(roundSizes(7)).toEqual([4, 2, 1]);
    expect(roundSizes(8)).toEqual([4, 2, 1]);
    expect(roundSizes(12)).toEqual([8, 4, 2, 1]);
    expect(roundSizes(13)).toEqual([8, 4, 2, 1]);
    expect(roundSizes(16)).toEqual([8, 4, 2, 1]);
  });

  it("después de la primera ronda cada ronda es la mitad de la anterior", () => {
    for (let n = 2; n <= 40; n++) {
      const sizes = roundSizes(n);
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBe(sizes[i - 1] / 2);
      }
      expect(sizes[sizes.length - 1]).toBe(1);
    }
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
      firstRoundMatches: 1,
      firstRoundDirect: 3,
      totalMatches: 4,
      rounds: 3,
    });
    expect(bracketPlan(8)).toMatchObject({
      firstRoundMatches: 4,
      firstRoundDirect: 0,
      byes: 0,
    });
    expect(bracketPlan(12)).toMatchObject({
      firstRoundMatches: 4,
      firstRoundDirect: 4,
      totalMatches: 11,
      rounds: 4,
    });
  });

  it("todos los pases libres son de la primera ronda", () => {
    for (let n = 2; n <= 40; n++) {
      const plan = bracketPlan(n);
      expect(plan.byes).toBe(plan.firstRoundDirect);
      expect(plan.firstRoundMatches * 2 + plan.firstRoundDirect).toBe(n);
    }
    expect(bracketPlan(5).byes).toBe(3);
    expect(bracketPlan(7).byes).toBe(1);
  });
});

describe("seedBracket", () => {
  it("con 5 parejas arma 4 cajas: 1 partido y 3 pases libres", () => {
    const slots = seedBracket(pairs(5));
    const r1 = slots.filter((s) => s.round === 1);
    expect(r1).toHaveLength(4);
    expect(r1.filter((s) => present(s).length === 2)).toHaveLength(1);
    const libres = r1.filter((s) => present(s).length === 1);
    expect(libres).toHaveLength(3);
    // Los libres son para los mejores seeds y ya vienen ganados.
    expect(libres.map((s) => s.pairAId).sort()).toEqual(["p1", "p2", "p3"]);
    expect(libres.every((s) => s.winnerId === s.pairAId)).toBe(true);
    expectValidBracket(slots, 5);
  });

  it("al mejor seed le toca el rival más flojo de la instancia", () => {
    // Con 5 clasificados se juega 4º vs 5º y esperan los tres primeros. La
    // semifinal tiene que ser 1º vs (ganador de 4º-5º) y 2º vs 3º, no 1º vs 3º.
    const slots = seedBracket(pairs(5));
    const play = slots.find((s) => s.round === 1 && s.pairBId)!;
    expect([play.pairAId, play.pairBId]).toEqual(["p4", "p5"]);

    const semis = slots.filter((s) => s.round === 2);
    const semiDe = (pairId: string) =>
      semis.find((s) => s.pairAId === pairId || s.pairBId === pairId)!;
    // El 1º espera al que salga del partido: su semi tiene un lado sin definir.
    expect(present(semiDe("p1"))).toEqual(["p1"]);
    // El 2º y el 3º se cruzan entre ellos.
    expect(present(semiDe("p2")).sort()).toEqual(["p2", "p3"]);
  });

  it("con 7 parejas la semifinal son 2 partidos, sin pase libre", () => {
    const slots = seedBracket(pairs(7));
    const r1 = slots.filter((s) => s.round === 1);
    expect(r1.filter((s) => present(s).length === 2)).toHaveLength(3);
    expect(r1.filter((s) => present(s).length === 1)).toHaveLength(1);

    const semis = slots.filter((s) => s.round === 2);
    expect(semis).toHaveLength(2);
    // La mejor entra directo a la semifinal, pero ahí juega: nadie pasa de
    // largo a la final.
    expect(semis[0].pairAId).toBe("p1");
    expect(semis.every((s) => s.winnerId === null)).toBe(true);
    expectValidBracket(slots, 7);
  });

  it("con 12 parejas los cuartos son 4 partidos justos", () => {
    const slots = seedBracket(pairs(12));
    const counts = roundSizes(12);
    expect(counts).toEqual([8, 4, 2, 1]);
    const r1 = slots.filter((s) => s.round === 1);
    expect(r1.filter((s) => present(s).length === 2)).toHaveLength(4);
    expect(r1.filter((s) => present(s).length === 1)).toHaveLength(4);
    expect(slots.filter((s) => s.round >= 2 && s.winnerId)).toHaveLength(0);
    expectValidBracket(slots, 12);
  });

  it("con 8 parejas son 4 partidos y ningún pase libre", () => {
    const slots = seedBracket(pairs(8));
    const r1 = slots.filter((s) => s.round === 1);
    expect(r1).toHaveLength(4);
    expect(r1.every((s) => present(s).length === 2)).toBe(true);
    expect(slots.filter((s) => s.winnerId)).toHaveLength(0);
    expectValidBracket(slots, 8);
  });

  it("cruza al mejor con el peor, con la siembra clásica", () => {
    const r1 = seedBracket(pairs(8)).filter((s) => s.round === 1);
    // 1-8 / 4-5 / 3-6 / 2-7: el 1º y el 2º en mitades opuestas y cada uno con
    // el rival más flojo que le puede tocar.
    expect(r1.map((s) => [s.pairAId, s.pairBId])).toEqual([
      ["p1", "p8"],
      ["p4", "p5"],
      ["p3", "p6"],
      ["p2", "p7"],
    ]);
  });

  it("los pases libres son para los mejores seeds", () => {
    for (let n = 3; n <= 33; n++) {
      const counts = roundSizes(n);
      const byes = counts[0] * 2 - n;
      const libres = seedBracket(pairs(n))
        .filter((s) => s.round === 1 && present(s).length === 1)
        .map((s) => s.pairAId!);
      expect(libres).toHaveLength(byes);
      // Los `byes` primeros de la tabla, en cualquier orden de cajas.
      expect([...libres].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))).toEqual(
        pairs(byes)
      );
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
    // Cuadro lleno de 8: la mejor y la peor son de la misma zona, así que hay
    // que intercambiar rivales con otro cruce.
    const seeded = ["z0a", "z1a", "z2a", "z0b", "z1b", "z1c", "z0c", "z0d"];
    const slots = seedBracket(seeded, zoneOf);
    expect(clashes(slots)).toEqual([]);
    expectValidBracket(slots, 8);
  });

  it("al reacomodar no le saca los pases libres a las mejores", () => {
    const seeded = ["z0p0", "z1p0", "z0p1", "z1p1", "z0p2"];
    const slots = seedBracket(seeded, zoneOf);
    const libres = slots
      .filter((s) => s.round === 1 && present(s).length === 1)
      .map((s) => s.pairAId);
    expect(libres.sort()).toEqual(["z0p0", "z0p1", "z1p0"]);
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

  it("con 5 parejas es 1 partido y 3 libres, sin cruces vacíos", () => {
    for (let i = 0; i < 20; i++) {
      const r1 = generateBracket(pairs(5)).filter((s) => s.round === 1);
      expect(r1).toHaveLength(4);
      expect(r1.filter((s) => present(s).length === 1)).toHaveLength(3);
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
    expect(slots.filter((s) => s.round === 1 && present(s).length === 1)).toHaveLength(3);
    expectValidBracket(slots, 5);
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
