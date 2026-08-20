"use client";

import { useState } from "react";
import type { PairingMode, TournamentDetail } from "@/lib/types";
import { pairLabel, pairingModeLabels, unpairedPlayers } from "@/lib/types";

type PairDraft = [string, string];

/**
 * Parejas del torneo. El organizador elige cómo armarlas:
 *
 *  - Tocando dos jugadores del pool arma la pareja a mano.
 *  - "Sortear el resto" completa al azar con los que quedaron libres, así se
 *    pueden fijar algunas y sortear las demás.
 *  - "Re-sortear" es el sorteo completo de siempre.
 *
 * El componente se remonta (key en el panel) cada vez que cambian las parejas
 * guardadas, así el borrador arranca siempre desde lo que hay en la base.
 */
export default function PairingSection({
  tournament,
  editable,
  busy,
  onSave,
}: {
  tournament: TournamentDetail;
  editable: boolean;
  busy: boolean;
  onSave: (pairs: PairDraft[], drawRest: boolean, mode: PairingMode) => void;
}) {
  const hasPairs = tournament.pairs.length > 0;
  // Sin parejas todavía no hay nada que mostrar: se abre directo en edición.
  const [editing, setEditing] = useState(!hasPairs);
  const [draft, setDraft] = useState<PairDraft[]>(() =>
    tournament.pairs.map((p): PairDraft => [p.player1.id, p.player2.id])
  );
  const [selected, setSelected] = useState<string | null>(null);

  const nameOf = (id: string) =>
    tournament.players.find((p) => p.id === id)?.name ?? "?";
  const taken = new Set(draft.flat());
  const free = tournament.players.filter((p) => !taken.has(p.id));
  const leftOut = unpairedPlayers(tournament.players, tournament.pairs);

  function pickPlayer(playerId: string) {
    if (selected === playerId) {
      setSelected(null);
      return;
    }
    if (selected) {
      setDraft((prev) => [...prev, [selected, playerId]]);
      setSelected(null);
      return;
    }
    setSelected(playerId);
  }

  /** Si el organizador fijó alguna pareja, el armado ya no es un sorteo puro. */
  const modeFor = (pairs: PairDraft[]): PairingMode =>
    pairs.length > 0 ? "MANUAL" : "DRAW";

  if (!editing) {
    return (
      <section className="card-border rounded-lg bg-surface-container p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">
              Parejas ({tournament.pairs.length})
            </h2>
            <p className="text-sm text-on-surface-variant">
              {pairingModeLabels[tournament.pairingMode]}
            </p>
          </div>
          {editable && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (confirm("¿Volver a sortear todas las parejas al azar?"))
                    onSave([], true, "DRAW");
                }}
                disabled={busy}
                className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
              >
                🎲 Re-sortear
              </button>
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-primary-fixed hover:underline"
              >
                Editar parejas
              </button>
            </div>
          )}
        </div>

        {leftOut.length > 0 && (
          <p className="mb-3 rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface-variant">
            ⚠ Sin pareja: {leftOut.map((p) => p.name).join(", ")}. El torneo se
            juega con {tournament.pairs.length} parejas.
          </p>
        )}

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {tournament.pairs.map((pair, i) => (
            <li
              key={pair.id}
              className="rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface"
            >
              {i + 1}. {pairLabel(pair)}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-on-surface">
          Armar parejas ({draft.length})
        </h2>
        {hasPairs && (
          <button
            onClick={() => setEditing(false)}
            className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline"
          >
            Cancelar
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-on-surface-variant">
        Tocá dos jugadores para formar una pareja. Podés fijar las que quieras y
        sortear el resto, o sortear todo de una.
      </p>

      <div className="mb-4">
        <p className="font-label-caps text-label-caps mb-2 text-on-surface-variant">
          Jugadores libres ({free.length})
        </p>
        {free.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No queda ninguno suelto.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {free.map((player) => {
              const active = selected === player.id;
              return (
                <li key={player.id}>
                  <button
                    onClick={() => pickPlayer(player.id)}
                    disabled={busy}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                      active
                        ? "border-primary-fixed bg-primary-fixed/15 font-semibold text-primary-fixed"
                        : "border-surface-bright text-on-surface hover:border-primary-fixed hover:text-primary-fixed"
                    }`}
                  >
                    {player.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {selected && (
          <p className="mt-2 text-sm text-primary-fixed">
            {nameOf(selected)} espera compañero: tocá con quién juega.
          </p>
        )}
      </div>

      {draft.length > 0 && (
        <ul className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {draft.map(([player1Id, player2Id], i) => (
            <li
              key={`${player1Id}-${player2Id}`}
              className="flex items-center justify-between gap-2 rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface"
            >
              <span className="truncate">
                {i + 1}. {nameOf(player1Id)} / {nameOf(player2Id)}
              </span>
              <button
                onClick={() =>
                  setDraft((prev) => prev.filter((_, index) => index !== i))
                }
                disabled={busy}
                aria-label={`Deshacer la pareja ${i + 1}`}
                className="shrink-0 text-on-surface-variant hover:text-error disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-surface-bright pt-4">
        <button
          onClick={() => onSave(draft, false, "MANUAL")}
          disabled={busy || draft.length < 2}
          className="rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          Guardar {draft.length} pareja{draft.length === 1 ? "" : "s"}
        </button>
        <button
          onClick={() => onSave(draft, true, modeFor(draft))}
          disabled={busy || free.length < 2}
          className="rounded-md border border-surface-bright px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high disabled:opacity-50"
        >
          🎲 Sortear el resto ({free.length})
        </button>
        {draft.length > 0 && (
          <button
            onClick={() => {
              setDraft([]);
              setSelected(null);
            }}
            disabled={busy}
            className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
          >
            Deshacer todas
          </button>
        )}
      </div>

      {draft.length < 2 && free.length < 4 && (
        <p className="mt-2 text-sm text-on-surface-variant">
          Hacen falta al menos 4 jugadores anotados para armar dos parejas.
        </p>
      )}
      {free.length === 1 && (
        <p className="mt-2 text-sm text-on-surface-variant">
          ⚠ {nameOf(free[0].id)} queda sin pareja: son impares. Podés sacarlo,
          anotar a alguien más, o dejarlo afuera y jugar igual.
        </p>
      )}
    </section>
  );
}
