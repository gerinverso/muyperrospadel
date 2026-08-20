import { describe, expect, it } from "vitest";
import {
  checkMerge,
  formatDni,
  isValidDni,
  normalizeDni,
  normalizeName,
  resolveRegistration,
  type MergeCandidate,
} from "./players";

describe("normalizeName", () => {
  it("saca los acentos", () => {
    expect(normalizeName("Matías Pavoni")).toBe("matias pavoni");
    expect(normalizeName("José Ángel Muñoz")).toBe("jose angel munoz");
  });

  it("hace que el mismo nombre con y sin acento caiga en la misma clave", () => {
    expect(normalizeName("Matías Pavoni")).toBe(normalizeName("Matias Pavoni"));
  });

  it("colapsa espacios y pasa a minusculas", () => {
    expect(normalizeName("  JUAN   perez ")).toBe("juan perez");
  });

  it("no rompe con cadena vacia ni con solo espacios", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
  });

  it("normaliza igual venga el acento precompuesto o descompuesto", () => {
    // "Matias" con la i-acento como un solo caracter (NFC) o como letra +
    // tilde combinante (NFD). Los teclados y los celulares mandan cualquiera
    // de las dos, y son cadenas distintas byte a byte.
    const nfc = "Matías".normalize("NFC");
    const nfd = "Matías".normalize("NFD");
    expect(nfc).not.toBe(nfd);
    expect(normalizeName(nfc)).toBe(normalizeName(nfd));
  });
});

describe("normalizeDni", () => {
  it("deja solo digitos", () => {
    expect(normalizeDni("12.345.678")).toBe("12345678");
    expect(normalizeDni(" 12 345 678 ")).toBe("12345678");
  });

  it("devuelve null cuando no queda nada", () => {
    expect(normalizeDni("")).toBeNull();
    expect(normalizeDni("   ")).toBeNull();
    expect(normalizeDni("abc")).toBeNull();
    expect(normalizeDni(null)).toBeNull();
    expect(normalizeDni(undefined)).toBeNull();
  });
});

describe("formatDni", () => {
  it("agrupa de a tres desde la derecha", () => {
    expect(formatDni("12345678")).toBe("12.345.678");
    expect(formatDni("1234567")).toBe("1.234.567");
  });

  it("devuelve null si no hay dni", () => {
    expect(formatDni(null)).toBeNull();
  });
});

describe("isValidDni", () => {
  it("acepta de 7 a 9 digitos", () => {
    expect(isValidDni("1234567")).toBe(true);
    expect(isValidDni("12345678")).toBe(true);
    expect(isValidDni("123456789")).toBe(true);
  });

  it("rechaza lo demas", () => {
    expect(isValidDni("123456")).toBe(false);
    expect(isValidDni("1234567890")).toBe(false);
    expect(isValidDni("")).toBe(false);
    expect(isValidDni("1234567a")).toBe(false);
  });
});

describe("resolveRegistration", () => {
  it("crea un jugador nuevo cuando el DNI no existe", () => {
    expect(resolveRegistration(null, false)).toEqual({ kind: "create" });
  });

  it("crea uno nuevo aunque el nombre ya exista: puede ser un homonimo", () => {
    // El caller ya busco por DNI y no encontro nada. Que exista otro jugador
    // con el mismo nombre no cambia la decision.
    expect(resolveRegistration(null, false)).toEqual({ kind: "create" });
  });

  it("reutiliza el jugador cuyo DNI coincide", () => {
    expect(resolveRegistration({ id: "p1" }, false)).toEqual({
      kind: "reuse",
      playerId: "p1",
    });
  });

  it("es idempotente si ya estaba anotado en ese torneo", () => {
    expect(resolveRegistration({ id: "p1" }, true)).toEqual({
      kind: "already-registered",
      playerId: "p1",
    });
  });
});

describe("checkMerge", () => {
  function player(over: Partial<MergeCandidate> = {}): MergeCandidate {
    return {
      id: "p1",
      name: "Matias Pavoni",
      dni: null,
      tournaments: [],
      pairedTournaments: [],
      ...over,
    };
  }

  it("fusiona al jugador viejo sin DNI con el nuevo que si lo tiene", () => {
    const keep = player({ id: "viejo", tournaments: [{ id: "t1", name: "Torneo 1" }] });
    const merge = player({ id: "nuevo", dni: "12345678" });

    expect(checkMerge(keep, merge)).toEqual({ ok: true, dni: "12345678" });
  });

  it("conserva el DNI del que sobrevive si ya tenia", () => {
    const keep = player({ id: "keep", dni: "12345678" });
    const merge = player({ id: "merge", dni: null });

    expect(checkMerge(keep, merge)).toEqual({ ok: true, dni: "12345678" });
  });

  it("rechaza fusionar un jugador consigo mismo", () => {
    const p = player({ id: "mismo" });
    const result = checkMerge(p, p);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("same-player");
  });

  it("rechaza cuando los dos tienen DNI distinto", () => {
    const keep = player({ id: "a", dni: "11111111" });
    const merge = player({ id: "b", dni: "22222222" });
    const result = checkMerge(keep, merge);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("both-have-dni");
  });

  it("rechaza cuando los dos tuvieron pareja en el mismo torneo", () => {
    const torneo = { id: "t1", name: "Torneo de Verano" };
    const keep = player({ id: "a", pairedTournaments: [torneo] });
    const merge = player({ id: "b", dni: "12345678", pairedTournaments: [torneo] });
    const result = checkMerge(keep, merge);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("shared-pair-tournament");
    expect(result.ok === false && result.message).toContain("Torneo de Verano");
  });

  it("permite fusionar si comparten torneo pero ninguno tiene pareja todavia", () => {
    // Caso comun: el admin anoto a mano al jugador viejo y despues la misma
    // persona se anoto sola al mismo torneo, antes del sorteo.
    const torneo = { id: "t1", name: "Torneo de Verano" };
    const keep = player({ id: "viejo", tournaments: [torneo] });
    const merge = player({ id: "nuevo", dni: "12345678", tournaments: [torneo] });

    expect(checkMerge(keep, merge)).toEqual({ ok: true, dni: "12345678" });
  });

  it("permite fusionar si tuvieron pareja en torneos distintos", () => {
    const keep = player({ id: "a", pairedTournaments: [{ id: "t1", name: "Torneo 1" }] });
    const merge = player({
      id: "b",
      dni: "12345678",
      pairedTournaments: [{ id: "t2", name: "Torneo 2" }],
    });

    expect(checkMerge(keep, merge)).toEqual({ ok: true, dni: "12345678" });
  });
});
