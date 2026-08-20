import { describe, expect, it } from "vitest";
import { buildPairs, validatePairDrafts, type PairDraft } from "@/lib/pairing";

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe("validatePairDrafts", () => {
  it("acepta una lista bien formada", () => {
    expect(validatePairDrafts(players(4), [["p1", "p2"], ["p3", "p4"]])).toBeNull();
  });

  it("acepta parejas de más (no exige que jueguen todos)", () => {
    expect(validatePairDrafts(players(6), [["p1", "p2"]])).toBeNull();
  });

  it("rechaza un jugador repetido en dos parejas", () => {
    expect(
      validatePairDrafts(players(4), [["p1", "p2"], ["p1", "p3"]])
    ).toMatch(/más de una pareja/);
  });

  it("rechaza el mismo jugador dos veces en la misma pareja", () => {
    expect(validatePairDrafts(players(4), [["p1", "p1"]])).toMatch(
      /el mismo jugador dos veces/
    );
  });

  it("rechaza un jugador ajeno al torneo", () => {
    expect(validatePairDrafts(players(4), [["p1", "p9"]])).toMatch(
      /no pertenece/
    );
  });
});

describe("buildPairs", () => {
  it("sortea todo cuando no hay parejas fijas", () => {
    const { pairs, unpaired } = buildPairs(players(8), [], true);
    expect(pairs).toHaveLength(4);
    expect(unpaired).toEqual([]);
    expect(new Set(pairs.flat())).toEqual(new Set(players(8)));
  });

  it("respeta las parejas fijas y sortea solo el resto", () => {
    const fixed: PairDraft[] = [["p1", "p5"]];
    const { pairs, unpaired } = buildPairs(players(6), fixed, true);
    expect(pairs).toHaveLength(3);
    expect(pairs[0]).toEqual(["p1", "p5"]);
    expect(unpaired).toEqual([]);
    // Ningún jugador ya tomado puede volver a aparecer en el sorteo.
    expect(pairs.flat().filter((id) => id === "p1")).toHaveLength(1);
  });

  it("con jugadores impares deja uno libre en vez de fallar", () => {
    const { pairs, unpaired } = buildPairs(players(13), [], true);
    expect(pairs).toHaveLength(6);
    expect(unpaired).toHaveLength(1);
    expect(players(13)).toContain(unpaired[0]);
  });

  it("con parejas fijas impares también deja uno libre", () => {
    const { pairs, unpaired } = buildPairs(players(7), [["p1", "p2"]], true);
    expect(pairs).toHaveLength(3);
    expect(unpaired).toHaveLength(1);
  });

  it("sin sortear, todos los libres quedan sin pareja", () => {
    const { pairs, unpaired } = buildPairs(players(6), [["p1", "p2"]], false);
    expect(pairs).toEqual([["p1", "p2"]]);
    expect(unpaired).toEqual(["p3", "p4", "p5", "p6"]);
  });

  it("no arma ninguna pareja si no hay jugadores libres suficientes", () => {
    const { pairs, unpaired } = buildPairs(players(3), [["p1", "p2"]], true);
    expect(pairs).toEqual([["p1", "p2"]]);
    expect(unpaired).toEqual(["p3"]);
  });

  it("tira error si las parejas fijas son inválidas", () => {
    expect(() => buildPairs(players(4), [["p1", "p1"]], true)).toThrow(
      /el mismo jugador dos veces/
    );
  });
});
