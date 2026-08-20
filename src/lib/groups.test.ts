import { describe, expect, it } from "vitest";
import {
  computeGroupStandings,
  computeQualifiers,
  distributeGroups,
  groupSizes,
  roundRobinMatches,
  seedQualifiers,
  type GroupLike,
  type GroupMatchResult,
} from "@/lib/groups";

/** Atajo para escribir resultados: "A gana a B". */
const won = (winner: string, loser: string): GroupMatchResult => ({
  pairAId: winner,
  pairBId: loser,
  winnerId: winner,
});

const pending = (a: string, b: string): GroupMatchResult => ({
  pairAId: a,
  pairBId: b,
  winnerId: null,
});

describe("distributeGroups", () => {
  it("reparte 7 parejas en 3 zonas como 3-2-2 sin perder ninguna", () => {
    const pairs = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
    const zones = distributeGroups(pairs, 3);
    expect(zones.map((z) => z.length)).toEqual([3, 2, 2]);
    expect(new Set(zones.flat())).toEqual(new Set(pairs));
  });

  it("soporta muchas zonas", () => {
    const pairs = Array.from({ length: 16 }, (_, i) => `p${i}`);
    const zones = distributeGroups(pairs, 5);
    expect(zones.map((z) => z.length)).toEqual([4, 3, 3, 3, 3]);
  });
});

describe("groupSizes", () => {
  it("anticipa el reparto sin sortear", () => {
    expect(groupSizes(8, 3)).toEqual([3, 3, 2]);
    expect(groupSizes(12, 4)).toEqual([3, 3, 3, 3]);
    expect(groupSizes(13, 4)).toEqual([4, 3, 3, 3]);
  });
});

describe("roundRobinMatches", () => {
  it("arma todos contra todos una sola vez", () => {
    expect(roundRobinMatches(["a", "b", "c", "d"])).toHaveLength(6);
    expect(roundRobinMatches(["a", "b"])).toEqual([["a", "b"]]);
  });
});

describe("computeGroupStandings", () => {
  it("ordena por partidos ganados", () => {
    const standings = computeGroupStandings(
      ["a", "b", "c"],
      [won("a", "b"), won("a", "c"), won("b", "c")]
    );
    expect(standings.map((r) => r.pairId)).toEqual(["a", "b", "c"]);
    expect(standings[0]).toMatchObject({ played: 2, wins: 2, losses: 0 });
    expect(standings[2]).toMatchObject({ played: 2, wins: 0, losses: 2 });
  });

  it("no cuenta los partidos sin resultado", () => {
    const standings = computeGroupStandings(
      ["a", "b", "c"],
      [won("a", "b"), pending("a", "c"), pending("b", "c")]
    );
    expect(standings[0]).toMatchObject({ pairId: "a", played: 1, wins: 1 });
    expect(standings.find((r) => r.pairId === "c")).toMatchObject({
      played: 0,
      wins: 0,
    });
  });

  it("desempata dos parejas por enfrentamiento directo", () => {
    const standings = computeGroupStandings(
      ["a", "b", "c"],
      [won("b", "a"), won("a", "c"), won("b", "c")]
    );
    // b y a ganaron distinto: b 2, a 1. El orden sale solo.
    expect(standings.map((r) => r.pairId)).toEqual(["b", "a", "c"]);
  });

  it("resuelve un empate de tres por mini-liga entre las empatadas", () => {
    // a y d empatan en 2; b y c empatan en 1. Dentro de cada empate manda el
    // cruce entre ellas: d le ganó a a, y b le ganó a c.
    const standings = computeGroupStandings(
      ["a", "b", "c", "d"],
      [
        won("a", "b"),
        won("a", "c"),
        won("d", "a"),
        won("b", "c"),
        won("d", "b"),
        won("c", "d"),
      ]
    );
    expect(standings.map((r) => r.pairId)).toEqual(["d", "a", "b", "c"]);
    expect(standings.every((r) => !r.tied)).toBe(true);
  });

  it("marca como empatadas las que la mini-liga no resuelve", () => {
    // Triángulo perfecto: a>b, b>c, c>a, y las tres le ganan a d.
    const matches = [
      won("a", "b"),
      won("b", "c"),
      won("c", "a"),
      won("a", "d"),
      won("b", "d"),
      won("c", "d"),
    ];
    const standings = computeGroupStandings(["a", "b", "c", "d"], matches);
    const tied = standings.filter((r) => r.tied).map((r) => r.pairId);
    expect(tied.sort()).toEqual(["a", "b", "c"]);
    expect(standings[3].pairId).toBe("d");
  });

  it("usa el orden manual del organizador cuando el empate no se resuelve", () => {
    const matches = [
      won("a", "b"),
      won("b", "c"),
      won("c", "a"),
      won("a", "d"),
      won("b", "d"),
      won("c", "d"),
    ];
    const standings = computeGroupStandings(
      ["a", "b", "c", "d"],
      matches,
      ["c", "b", "a"]
    );
    expect(standings.map((r) => r.pairId)).toEqual(["c", "b", "a", "d"]);
  });

  it("el orden manual no puede pasar por encima de los partidos ganados", () => {
    const standings = computeGroupStandings(
      ["a", "b", "c"],
      [won("a", "b"), won("a", "c"), won("b", "c")],
      ["c", "b", "a"]
    );
    expect(standings.map((r) => r.pairId)).toEqual(["a", "b", "c"]);
  });

  it("es estable: mismo resultado sin importar el orden de entrada", () => {
    const matches = [
      won("a", "b"),
      won("b", "c"),
      won("c", "a"),
      won("a", "d"),
      won("b", "d"),
      won("c", "d"),
    ];
    const one = computeGroupStandings(["a", "b", "c", "d"], matches);
    const other = computeGroupStandings(["d", "c", "b", "a"], matches);
    expect(one.map((r) => r.pairId)).toEqual(other.map((r) => r.pairId));
  });
});

/**
 * Zona lista para usar: `size` parejas y todos contra todos ya jugado, donde
 * siempre gana la de índice más bajo. La tabla queda igual al orden de
 * `pairIds`, así los tests hablan de puestos y no de resultados.
 */
const zone = (
  index: number,
  size: number,
  qualifiers: number | null = null
): GroupLike => {
  const pairIds = Array.from({ length: size }, (_, i) => `z${index}p${i}`);
  return {
    id: `g${index}`,
    index,
    pairIds,
    matches: roundRobinMatches(pairIds).map(([a, b]) => won(a, b)),
    qualifiers,
    tiebreakOrder: [],
  };
};

describe("computeQualifiers", () => {
  it("saca los primeros de cada zona con el número general", () => {
    const zones = computeQualifiers([zone(0, 3), zone(1, 3)], 2);
    expect(zones.map((z) => z.pairIds)).toEqual([
      ["z0p0", "z0p1"],
      ["z1p0", "z1p1"],
    ]);
  });

  it("con zonas desparejas respeta el número pedido en las que alcanza", () => {
    // 8 parejas en 3 zonas: 3-3-2. Con 2 por zona pasan 6.
    const zones = computeQualifiers([zone(0, 3), zone(1, 3), zone(2, 2)], 2);
    expect(zones.map((z) => z.qualifiers)).toEqual([2, 2, 2]);
    expect(zones.flatMap((z) => z.pairIds)).toHaveLength(6);
  });

  it("si la zona tiene menos parejas que clasificados, pasan todas", () => {
    const zones = computeQualifiers([zone(0, 4), zone(1, 2)], 3);
    expect(zones[0]).toMatchObject({ requested: 3, qualifiers: 3 });
    expect(zones[1]).toMatchObject({ requested: 3, qualifiers: 2 });
    expect(zones[1].pairIds).toEqual(["z1p0", "z1p1"]);
  });

  it("respeta el override de clasificados de cada zona", () => {
    const zones = computeQualifiers([zone(0, 4, 2), zone(1, 4), zone(2, 2, 1)], 3);
    expect(zones.map((z) => z.qualifiers)).toEqual([2, 3, 1]);
  });

  it("nunca clasifica menos de uno", () => {
    const zones = computeQualifiers([zone(0, 3, 0)], 2);
    expect(zones[0].qualifiers).toBe(1);
  });

  it("devuelve la tabla completa de cada zona para poder mostrarla", () => {
    const zones = computeQualifiers([zone(0, 4)], 2);
    expect(zones[0].standings.map((r) => r.pairId)).toEqual([
      "z0p0",
      "z0p1",
      "z0p2",
      "z0p3",
    ]);
  });
});

describe("seedQualifiers", () => {
  it("intercala por puesto rotando las zonas", () => {
    const zones = computeQualifiers([zone(0, 3), zone(1, 3), zone(2, 3)], 2);
    expect(seedQualifiers(zones).map((s) => s.pairId)).toEqual([
      "z0p0",
      "z1p0",
      "z2p0",
      "z1p1",
      "z2p1",
      "z0p1",
    ]);
  });

  it("no pierde clasificados cuando las zonas pasan distinta cantidad", () => {
    const zones = computeQualifiers([zone(0, 4, 3), zone(1, 2, 1)], 2);
    const seeded = seedQualifiers(zones);
    expect(seeded).toHaveLength(4);
    expect(seeded.map((s) => s.pairId)).toEqual([
      "z0p0",
      "z1p0",
      "z0p1",
      "z0p2",
    ]);
  });

  it("etiqueta cada clasificado con su zona", () => {
    const zones = computeQualifiers([zone(0, 3), zone(1, 3)], 2);
    const byZone = seedQualifiers(zones).map((s) => s.groupIndex);
    expect(byZone).toEqual([0, 1, 1, 0]);
  });

  it("sin zonas devuelve una lista vacía", () => {
    expect(seedQualifiers([])).toEqual([]);
  });
});
