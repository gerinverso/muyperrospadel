"use client";

import { useState } from "react";
import type { TournamentDetail } from "@/lib/types";
import { pairLabel } from "@/lib/types";
import { distributeGroups } from "@/lib/groups";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const zoneName = (index: number) => `Zona ${LETTERS[index] ?? index + 1}`;
/** Partidos de una zona jugando todos contra todos una vez. */
const matchesIn = (size: number) => (size * (size - 1)) / 2;

/**
 * Borrador de zonas: se reparte al azar y el organizador puede mover parejas de
 * una zona a otra antes de confirmar. Recién al apretar "Armar zonas" se crean
 * las zonas y el fixture, así se puede acomodar todo sin romper nada.
 *
 * Las zonas pueden quedar de distinto tamaño a propósito; lo único que no se
 * permite es una zona con menos de 2 parejas, porque no tendría partidos.
 */
export default function ZoneDraftSection({
  tournament,
  busy,
  onGenerate,
}: {
  tournament: TournamentDetail;
  busy: boolean;
  onGenerate: (groups: string[][]) => void;
}) {
  const groupsCount = tournament.groupsCount ?? 2;
  const [zones, setZones] = useState<string[][]>(() =>
    distributeGroups(
      tournament.pairs.map((p) => p.id),
      groupsCount
    )
  );

  const pairsById = new Map(tournament.pairs.map((p) => [p.id, p]));
  const qualifiersPerGroup = tournament.qualifiersPerGroup ?? 1;
  const emptyZone = zones.findIndex((zone) => zone.length < 2);
  const totalMatches = zones.reduce(
    (total, zone) => total + matchesIn(zone.length),
    0
  );
  const qualifierCount = zones.reduce(
    (total, zone) => total + Math.min(qualifiersPerGroup, zone.length),
    0
  );

  function movePair(pairId: string, to: number) {
    setZones((prev) =>
      prev.map((zone, i) => {
        const without = zone.filter((id) => id !== pairId);
        return i === to ? [...without, pairId] : without;
      })
    );
  }

  function shuffleAgain() {
    setZones(
      distributeGroups(
        tournament.pairs.map((p) => p.id),
        groupsCount
      )
    );
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-on-surface">
          Armar zonas ({zones.length})
        </h2>
        <button
          onClick={shuffleAgain}
          disabled={busy}
          className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
        >
          🎲 Re-repartir al azar
        </button>
      </div>
      <p className="mb-4 text-sm text-on-surface-variant">
        Se repartieron {tournament.pairs.length} parejas al azar. Podés mover
        cualquiera de zona antes de confirmar: las zonas pueden quedar de
        distinto tamaño. Van a jugarse {totalMatches} partidos y clasifican{" "}
        {qualifierCount}.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {zones.map((zone, index) => (
          <div
            key={index}
            className="rounded-lg border border-surface-bright bg-surface-dim p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-label-caps text-label-caps text-on-surface">
                {zoneName(index)}
              </h3>
              <span
                className={`font-label-caps text-label-caps rounded-full px-2 py-0.5 ${
                  zone.length < 2
                    ? "bg-error-container text-on-error-container"
                    : "border border-surface-bright text-on-surface-variant"
                }`}
              >
                {zone.length} parejas · {matchesIn(zone.length)} partidos
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {zone.map((pairId) => (
                <li
                  key={pairId}
                  className="flex items-center gap-2 rounded-md bg-surface-container-high px-2 py-1.5 text-sm text-on-surface"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {pairLabel(pairsById.get(pairId) ?? null)}
                  </span>
                  <select
                    value={index}
                    onChange={(e) => movePair(pairId, Number(e.target.value))}
                    disabled={busy}
                    aria-label="Mover a otra zona"
                    className="shrink-0 rounded-md border border-surface-bright bg-surface-dim px-1.5 py-1 text-xs text-on-surface-variant outline-none focus:border-primary-fixed"
                  >
                    {zones.map((_, target) => (
                      <option key={target} value={target}>
                        {zoneName(target)}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
              {zone.length === 0 && (
                <li className="px-2 py-1.5 text-sm text-on-surface-variant">
                  Vacía
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {emptyZone !== -1 && (
        <p className="mb-3 text-sm text-error">
          {zoneName(emptyZone)} tiene menos de 2 parejas: movele alguna o bajá la
          cantidad de zonas en el formato.
        </p>
      )}

      <button
        onClick={() => onGenerate(zones)}
        disabled={busy || emptyZone !== -1}
        className="rounded-md bg-primary-fixed px-4 py-2 font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
      >
        Armar zonas y fixture
      </button>
    </section>
  );
}
