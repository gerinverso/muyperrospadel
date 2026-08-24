"use client";

import type { Group, Match, Pair } from "@/lib/types";
import { pairLabel } from "@/lib/types";
import {
  computeGroupStandings,
  toGroupMatchResults,
  type StandingRow,
} from "@/lib/groups";
import Icon from "@/components/Icon";

export type GroupSettings = {
  qualifiers?: number | null;
  tiebreakOrder?: string[];
};

export default function GroupsView({
  groups,
  qualifiersPerGroup,
  editable = false,
  onPickWinner,
  onSaveGroup,
  busyMatchId,
}: {
  groups: Group[];
  /** Clasificados generales del torneo; cada zona puede tener los suyos. */
  qualifiersPerGroup: number;
  editable?: boolean;
  onPickWinner?: (matchId: string, winnerId: string) => void;
  onSaveGroup?: (groupId: string, settings: GroupSettings) => void;
  busyMatchId?: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
      {groups.map((group) => (
        <ZoneCard
          key={group.id}
          group={group}
          qualifiersPerGroup={qualifiersPerGroup}
          editable={editable}
          onPickWinner={onPickWinner}
          onSaveGroup={onSaveGroup}
          busyMatchId={busyMatchId}
        />
      ))}
    </div>
  );
}

function ZoneCard({
  group,
  qualifiersPerGroup,
  editable,
  onPickWinner,
  onSaveGroup,
  busyMatchId,
}: {
  group: Group;
  qualifiersPerGroup: number;
  editable: boolean;
  onPickWinner?: (matchId: string, winnerId: string) => void;
  onSaveGroup?: (groupId: string, settings: GroupSettings) => void;
  busyMatchId?: string | null;
}) {
  const pairsById = new Map(group.pairs.map((p) => [p.id, p]));
  const standings = computeGroupStandings(
    group.pairs.map((p) => p.id),
    toGroupMatchResults(group.matches),
    group.tiebreakOrder
  );
  const playedCount = group.matches.filter((m) => m.winner).length;
  // Una zona nunca puede clasificar más parejas de las que tiene.
  const qualifies = Math.min(
    group.qualifiers ?? qualifiersPerGroup,
    group.pairs.length
  );
  const canEditZone = editable && Boolean(onSaveGroup);

  /** Dos filas son intercambiables sólo si el empate no lo resuelve la cancha. */
  const sameTie = (a: StandingRow, b: StandingRow) =>
    a.wins === b.wins && a.tiebreakWins === b.tiebreakWins;

  function swapRows(i: number, j: number) {
    const order = standings.map((row) => row.pairId);
    [order[i], order[j]] = [order[j], order[i]];
    onSaveGroup?.(group.id, { tiebreakOrder: order });
  }

  return (
    <div className="card-border overflow-hidden rounded-xl bg-surface-container-high">
      {/* Encabezado de zona con acento neón */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-bright bg-surface-container px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon name="groups" className="text-xl text-primary-fixed" />
          <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">
            {group.name}
          </h3>
        </div>
        <span className="font-label-caps text-label-caps rounded-full border border-surface-bright px-2 py-1 text-on-surface-variant">
          {playedCount}/{group.matches.length} jugados
        </span>
      </div>

      {/* Tabla de posiciones */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2rem] items-center gap-2 pb-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            #
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            Pareja
          </span>
          <span className="font-label-caps text-label-caps text-center text-on-surface-variant">
            PJ
          </span>
          <span className="font-label-caps text-label-caps text-center text-primary-fixed">
            PG
          </span>
          <span className="font-label-caps text-label-caps text-center text-on-surface-variant">
            PP
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {standings.map((row, i) => {
            const pair = pairsById.get(row.pairId);
            const passes = i < qualifies;
            const canMoveUp =
              canEditZone && i > 0 && sameTie(row, standings[i - 1]);
            const canMoveDown =
              canEditZone &&
              i < standings.length - 1 &&
              sameTie(row, standings[i + 1]);
            return (
              <div
                key={row.pairId}
                className={`grid grid-cols-[2rem_1fr_2rem_2rem_2rem] items-center gap-2 rounded-lg px-1 py-1.5 ${
                  passes
                    ? "bg-primary-fixed/10 ring-1 ring-inset ring-primary-fixed/30"
                    : ""
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    passes
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : "border border-surface-bright text-on-surface-variant"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  <span
                    className={`truncate text-sm ${
                      passes
                        ? "font-semibold text-on-surface"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {pair ? pairLabel(pair) : "—"}
                  </span>
                  {/* Sólo aparecen en las parejas que quedaron empatadas de
                      verdad: mover una que no está empatada no haría nada,
                      porque los partidos ganados manda. */}
                  {(canMoveUp || canMoveDown) && (
                    <span className="flex shrink-0 items-center">
                      {canMoveUp && (
                        <button
                          type="button"
                          onClick={() => swapRows(i, i - 1)}
                          aria-label="Subir en el desempate"
                          title="Desempate: subir"
                          className="px-0.5 text-xs text-on-surface-variant hover:text-primary-fixed"
                        >
                          ▲
                        </button>
                      )}
                      {canMoveDown && (
                        <button
                          type="button"
                          onClick={() => swapRows(i, i + 1)}
                          aria-label="Bajar en el desempate"
                          title="Desempate: bajar"
                          className="px-0.5 text-xs text-on-surface-variant hover:text-primary-fixed"
                        >
                          ▼
                        </button>
                      )}
                    </span>
                  )}
                </span>
                <span className="text-center text-sm text-on-surface-variant">
                  {row.played}
                </span>
                <span className="text-center text-sm font-bold text-primary-fixed">
                  {row.wins}
                </span>
                <span className="text-center text-sm text-on-surface-variant">
                  {row.losses}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-label-caps text-label-caps flex items-center gap-1 text-on-surface-variant">
            <span className="inline-block h-2 w-2 rounded-full bg-primary-fixed" />
            Clasifican {qualifies}
            {group.qualifiers !== null && " (propio de la zona)"}
          </p>
          {canEditZone && (
            <label className="flex items-center gap-1 text-xs text-on-surface-variant">
              Pasan
              <select
                value={group.qualifiers ?? ""}
                onChange={(e) =>
                  onSaveGroup?.(group.id, {
                    qualifiers:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="rounded-md border border-surface-bright bg-surface-dim px-1.5 py-1 text-xs text-on-surface outline-none focus:border-primary-fixed"
              >
                <option value="">
                  General ({Math.min(qualifiersPerGroup, group.pairs.length)})
                </option>
                {group.pairs.map((_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Partidos de la zona */}
      <div className="mt-3 border-t border-surface-bright px-4 py-3">
        <p className="font-label-caps text-label-caps mb-2 text-on-surface-variant">
          Partidos
        </p>
        <div className="flex flex-col gap-2">
          {group.matches.map((m) => (
            <ZoneMatchRow
              key={m.id}
              match={m}
              editable={editable}
              busy={busyMatchId === m.id}
              onPickWinner={onPickWinner}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
function ZoneMatchRow({
  match,
  editable,
  busy,
  onPickWinner,
}: {
  match: Match;
  editable: boolean;
  busy: boolean;
  onPickWinner?: (matchId: string, winnerId: string) => void;
}) {
  const canPick =
    editable && Boolean(onPickWinner) && Boolean(match.pairA) && Boolean(match.pairB);

  function side(pair: Pair | null, align: "left" | "right") {
    const label = pair ? pairLabel(pair) : "A definir";
    const isWinner = Boolean(match.winner && match.winner.id === pair?.id);
    const base = `flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
      align === "right" ? "flex-row-reverse text-right" : "text-left"
    }`;
    const state = isWinner
      ? "bg-primary-fixed/15 font-semibold text-primary-fixed"
      : "text-on-surface";

    const content = (
      <>
        {isWinner && (
          <Icon name="trophy" className="text-base text-primary-fixed" />
        )}
        <span className="truncate">{label}</span>
      </>
    );

    if (canPick && pair) {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => onPickWinner?.(match.id, pair.id)}
          className={`${base} ${state} transition-colors hover:bg-surface-bright disabled:opacity-50`}
        >
          {content}
        </button>
      );
    }
    return <span className={`${base} ${state}`}>{content}</span>;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-container p-1">
      {side(match.pairA, "left")}
      <span className="font-label-caps text-label-caps shrink-0 px-1 text-on-surface-variant">
        vs
      </span>
      {side(match.pairB, "right")}
    </div>
  );
}
