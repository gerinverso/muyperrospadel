import { describe, expect, it } from "vitest";
import { countdownLabel, daysUntil } from "./countdown";

/** Helper: instante en hora argentina (UTC-3) expresado en UTC. */
function ar(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

describe("daysUntil", () => {
  it("cuenta dias de calendario, no horas", () => {
    // Faltan 14 horas, pero es el dia siguiente: 1 dia.
    expect(daysUntil(ar("2026-08-22T08:00:00"), ar("2026-08-21T18:00:00"))).toBe(1);
  });

  it("da 0 el mismo dia aunque falten horas", () => {
    expect(daysUntil(ar("2026-08-21T22:00:00"), ar("2026-08-21T07:00:00"))).toBe(0);
  });

  it("da negativo si ya paso", () => {
    expect(daysUntil(ar("2026-08-19T10:00:00"), ar("2026-08-21T10:00:00"))).toBe(-2);
  });

  it("usa el huso argentino y no el del servidor", () => {
    // 2026-08-21 23:00 en Argentina son las 02:00 UTC del 22. Contado en UTC
    // daria un dia menos: tiene que dar 1 (el torneo es el 22 en Argentina).
    const now = new Date("2026-08-22T02:00:00Z"); // = 21/08 23:00 AR
    const startsAt = ar("2026-08-23T09:00:00");
    expect(daysUntil(startsAt, now)).toBe(2);
  });
});

describe("countdownLabel", () => {
  it("pluraliza bien", () => {
    expect(countdownLabel(ar("2026-08-25T09:00:00"), ar("2026-08-21T10:00:00"))).toBe(
      "Faltan 4 días"
    );
    expect(countdownLabel(ar("2026-08-22T09:00:00"), ar("2026-08-21T10:00:00"))).toBe(
      "Falta 1 día"
    );
  });

  it("avisa cuando es hoy", () => {
    expect(countdownLabel(ar("2026-08-21T20:00:00"), ar("2026-08-21T10:00:00"))).toBe(
      "¡Es hoy!"
    );
  });

  it("no muestra contador si no hay fecha", () => {
    expect(countdownLabel(null, ar("2026-08-21T10:00:00"))).toBeNull();
    expect(countdownLabel(undefined, ar("2026-08-21T10:00:00"))).toBeNull();
  });

  it("no muestra contador si la fecha ya paso", () => {
    expect(countdownLabel(ar("2026-08-19T09:00:00"), ar("2026-08-21T10:00:00"))).toBeNull();
  });
});
