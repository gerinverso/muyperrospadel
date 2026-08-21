"use client";

import { useState } from "react";
import type { TournamentDetail, TournamentFormat } from "@/lib/types";
import { formatLabels } from "@/lib/types";
import { groupSizes } from "@/lib/groups";
import { bracketPlan } from "@/lib/bracket";

/**
 * Formato del torneo: eliminación directa o fase de grupos con N zonas y N
 * clasificados por zona.
 *
 * Muestra en vivo cómo queda el reparto ("3-3-2"), cuántos clasifican y de qué
 * tamaño va a ser el cuadro, así el organizador ve las consecuencias antes de
 * guardar. Los avisos del servidor (zonas donde clasifican todas, pases libres)
 * se muestran abajo: son advertencias, no errores.
 */
export default function FormatSection({
  tournament,
  warnings,
  busy,
  onSave,
}: {
  tournament: TournamentDetail;
  warnings: string[];
  busy: boolean;
  onSave: (
    format: TournamentFormat,
    groupsCount?: number,
    qualifiersPerGroup?: number
  ) => void;
}) {
  const [format, setFormat] = useState<TournamentFormat>(tournament.format);
  const [groupsCount, setGroupsCount] = useState(
    String(tournament.groupsCount ?? 2)
  );
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(
    String(tournament.qualifiersPerGroup ?? 2)
  );

  const pairCount = tournament.pairs.length;
  const zones = Number(groupsCount);
  const qualifiers = Number(qualifiersPerGroup);
  const maxZones = Math.max(1, Math.floor(pairCount / 2));
  const validZones =
    Number.isInteger(zones) && zones >= 1 && (pairCount === 0 || zones <= maxZones);
  const validQualifiers = Number.isInteger(qualifiers) && qualifiers >= 1;

  const sizes = validZones && pairCount > 0 ? groupSizes(pairCount, zones) : [];
  const qualifierCount = validQualifiers
    ? sizes.reduce((total, size) => total + Math.min(qualifiers, size), 0)
    : 0;
  const plan = qualifierCount >= 2 ? bracketPlan(qualifierCount) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (format === "GROUPS_KO") {
      onSave(format, zones, qualifiers);
    } else {
      onSave(format);
    }
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <h2 className="mb-3 text-lg font-semibold text-on-surface">
        Formato del torneo
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          {(["SINGLE_ELIMINATION", "GROUPS_KO"] as const).map((f) => (
            <label
              key={f}
              className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-sm ${
                format === f
                  ? "border-primary-fixed bg-primary-fixed/10 text-primary-fixed"
                  : "border-surface-bright text-on-surface-variant"
              }`}
            >
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
                className="mr-2"
              />
              {formatLabels[f]}
            </label>
          ))}
        </div>

        {format === "GROUPS_KO" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-on-surface">
                  Cantidad de zonas
                </span>
                <input
                  type="number"
                  min={1}
                  max={pairCount > 0 ? maxZones : undefined}
                  className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
                  value={groupsCount}
                  onChange={(e) => setGroupsCount(e.target.value)}
                />
                {pairCount > 0 && (
                  <span className="mt-1 block text-xs text-on-surface-variant">
                    Hasta {maxZones} con {pairCount} parejas (mínimo 2 por zona)
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-on-surface">
                  Clasifican por zona
                </span>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
                  value={qualifiersPerGroup}
                  onChange={(e) => setQualifiersPerGroup(e.target.value)}
                />
                <span className="mt-1 block text-xs text-on-surface-variant">
                  Después se puede ajustar zona por zona
                </span>
              </label>
            </div>

            {sizes.length > 0 && (
              <p className="rounded-md bg-surface-dim px-3 py-2 text-sm text-on-surface-variant">
                Zonas de{" "}
                <strong className="text-on-surface">{sizes.join("-")}</strong>{" "}
                parejas · clasifican{" "}
                <strong className="text-on-surface">{qualifierCount}</strong>
                {plan && (
                  <>
                    {" "}
                    · cuadro de{" "}
                    <strong className="text-on-surface">
                      {plan.totalMatches}
                    </strong>{" "}
                    partidos
                    {plan.byes > 0 &&
                      ` (${plan.byes} pase${plan.byes === 1 ? "" : "s"} libre${
                        plan.byes === 1 ? "" : "s"
                      })`}
                  </>
                )}
              </p>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={busy || (format === "GROUPS_KO" && !validZones)}
          className="self-start rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          Guardar formato
        </button>
      </form>

      {warnings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-surface-bright pt-3">
          {warnings.map((warning) => (
            <li key={warning} className="text-sm text-on-surface-variant">
              ⚠ {warning}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
