"use client";

import type { Match } from "@/lib/types";
import { pairLabel } from "@/lib/types";
import { roundName } from "@/lib/round-names";

export default function BracketView({
  matches,
  onPickWinner,
  busyMatchId,
}: {
  matches: Match[];
  onPickWinner?: (matchId: string, winnerId: string) => void;
  busyMatchId?: string | null;
}) {
  if (matches.length === 0) return null;

  const totalRounds = Math.max(...matches.map((m) => m.round));
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  const finalMatch = matches.find((m) => m.round === totalRounds);
  const champion = finalMatch?.winner ?? null;

  return (
    <div className="flex items-stretch gap-3 overflow-x-auto pb-4">
      {rounds.map((round) => {
        const roundMatches = matches
          .filter((m) => m.round === round)
          .sort((a, b) => a.slot - b.slot);
        const isFinalRound = round === totalRounds;
        return (
          <div key={round} className="flex min-w-[230px] flex-col gap-3">
            <div className="flex justify-center">
              <span
                className={`font-label-caps text-label-caps rounded-full px-3 py-1 ${
                  isFinalRound
                    ? "bg-primary-fixed text-on-primary-fixed"
                    : "border border-surface-bright bg-surface-container text-on-surface-variant"
                }`}
              >
                {roundName(round, totalRounds)}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  // Los pases libres son cajas de la primera ronda con una sola
                  // pareja. En las rondas siguientes un lado vacío es un cruce
                  // que todavía espera el resultado del partido que lo alimenta.
                  bye={round === 1 && Boolean(m.pairA) !== Boolean(m.pairB)}
                  onPickWinner={onPickWinner}
                  busy={busyMatchId === m.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Columna del campeón */}
      {champion && (
        <div className="flex min-w-[200px] flex-col gap-3">
          <div className="flex justify-center">
            <span className="font-label-caps text-label-caps rounded-full bg-primary-fixed px-3 py-1 text-on-primary-fixed">
              Campeón
            </span>
          </div>
          <div className="flex flex-1 items-center">
            <div className="neon-glow w-full rounded-xl border border-primary-fixed bg-surface-container p-4 text-center">
              <span className="material-symbols-outlined text-4xl text-primary-fixed">
                emoji_events
              </span>
              <p className="mt-1 font-bold text-on-surface">
                {pairLabel(champion)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  bye,
  onPickWinner,
  busy,
}: {
  match: Match;
  /** El cruce no puede tener rival: la pareja que llega pasa sin jugar. */
  bye: boolean;
  onPickWinner?: (matchId: string, winnerId: string) => void;
  busy?: boolean;
}) {
  // Se puede elegir ganador siempre que estén las dos parejas; si ya hay uno,
  // tocar la otra pareja lo cambia (y el backend reacomoda las rondas siguientes).
  const canPick =
    Boolean(onPickWinner) && Boolean(match.pairA) && Boolean(match.pairB);
  const decided = Boolean(match.winner);

  if (bye) {
    const pair = match.pairA ?? match.pairB;
    return (
      <div className="card-border overflow-hidden rounded-lg bg-surface-container-high">
        <PairRow
          pair={pair}
          isWinner={Boolean(match.winner)}
          dimmed={false}
          clickable={false}
          onClick={() => {}}
        />
        <p className="font-label-caps text-label-caps border-t border-surface-bright px-3 py-1 text-on-surface-variant">
          Pasa libre
        </p>
      </div>
    );
  }

  return (
    <div
      className={`card-border overflow-hidden rounded-lg bg-surface-container-high transition-all ${
        canPick ? "hover:border-primary-fixed/60" : ""
      }`}
    >
      <PairRow
        pair={match.pairA}
        isWinner={Boolean(match.winner && match.winner.id === match.pairA?.id)}
        dimmed={decided && match.winner?.id !== match.pairA?.id}
        clickable={canPick}
        disabled={busy}
        onClick={() => match.pairA && onPickWinner?.(match.id, match.pairA.id)}
      />
      <div className="flex items-center gap-2 px-2">
        <div className="h-px flex-1 bg-surface-bright" />
        <span className="font-label-caps text-[10px] text-on-surface-variant">
          vs
        </span>
        <div className="h-px flex-1 bg-surface-bright" />
      </div>
      <PairRow
        pair={match.pairB}
        isWinner={Boolean(match.winner && match.winner.id === match.pairB?.id)}
        dimmed={decided && match.winner?.id !== match.pairB?.id}
        clickable={canPick}
        disabled={busy}
        onClick={() => match.pairB && onPickWinner?.(match.id, match.pairB.id)}
      />
    </div>
  );
}

function PairRow({
  pair,
  isWinner,
  dimmed,
  clickable,
  disabled,
  onClick,
}: {
  pair: Match["pairA"];
  isWinner: boolean;
  dimmed: boolean;
  clickable: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const label = pairLabel(pair);
  const baseClasses =
    "flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm";
  const stateClasses = isWinner
    ? "bg-primary-fixed/15 font-semibold text-primary-fixed"
    : dimmed
      ? "text-on-surface-variant"
      : pair
        ? "text-on-surface"
        : "text-on-surface-variant italic";

  const content = (
    <>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {isWinner && (
        <span className="material-symbols-outlined shrink-0 text-base text-primary-fixed">
          emoji_events
        </span>
      )}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${stateClasses} transition-colors hover:bg-surface-bright disabled:opacity-50`}
      >
        {content}
      </button>
    );
  }

  return <div className={`${baseClasses} ${stateClasses}`}>{content}</div>;
}
