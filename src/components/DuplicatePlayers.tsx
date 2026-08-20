"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDni } from "@/lib/players";
import type { PlayerWithStats } from "@/lib/types";

type DuplicatePlayer = {
  id: string;
  name: string;
  dni: string | null;
  createdAt: string;
  tournamentCount: number;
  pairedTournamentCount: number;
};

type DuplicateGroup = {
  nameKey: string;
  mergeable: boolean;
  blockedReason: string | null;
  players: DuplicatePlayer[];
};

/**
 * Unificación de jugadores duplicados.
 *
 * Cuando alguien se anota solo, el sistema siempre le crea un jugador nuevo,
 * aunque su nombre ya estuviera en la base: puede ser un homónimo, y quedarse
 * con el registro ajeno le robaría el historial a otra persona. Acá es donde se
 * decide, a mano, cuáles son de verdad la misma persona.
 *
 * Es también el camino por el que los jugadores viejos terminan teniendo DNI:
 * el registro histórico se queda con el DNI del que creó la auto-inscripción.
 */
export default function DuplicatePlayers() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keepId, setKeepId] = useState("");
  const [mergeId, setMergeId] = useState("");

  const load = useCallback(async () => {
    const [dupRes, playersRes] = await Promise.all([
      fetch("/api/players/duplicates", { cache: "no-store" }),
      fetch("/api/players", { cache: "no-store" }),
    ]);
    if (dupRes.ok) setGroups(await dupRes.json());
    else setError("No se pudieron cargar los duplicados");
    if (playersRes.ok) setPlayers(await playersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load();
  }, [load]);

  /** Fusiona de a uno contra el que se conserva y frena al primer rechazo. */
  async function merge(keep: string, toMerge: string[]) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      for (const id of toMerge) {
        const res = await fetch("/api/players/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keepId: keep, mergeId: id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "No se pudo fusionar");
          await load();
          return;
        }
      }
      setNotice("Jugadores unificados");
      setKeepId("");
      setMergeId("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="card-border rounded-lg bg-surface-container p-5 text-center text-on-surface-variant">
        Buscando duplicados...
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      {error && (
        <p className="rounded-md bg-error-container px-4 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-surface-container-high px-4 py-2 text-sm text-primary-fixed">
          {notice}
        </p>
      )}

      <section className="card-border rounded-lg bg-surface-container p-5">
        <h2 className="text-lg font-semibold text-on-surface">
          Posibles duplicados ({groups.length})
        </h2>
        <p className="mb-3 text-sm text-on-surface-variant">
          Jugadores que se llaman igual. Elegí cuál se queda: se lleva los
          torneos, las parejas y el DNI de los otros, y el resto se borra.
        </p>

        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            No hay nombres repetidos.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {groups.map((group) => (
              <DuplicateGroupRow
                key={group.nameKey}
                group={group}
                busy={busy}
                onMerge={merge}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="card-border rounded-lg bg-surface-container p-5">
        <h2 className="text-lg font-semibold text-on-surface">
          Fusionar a mano
        </h2>
        <p className="mb-3 text-sm text-on-surface-variant">
          Para los que se escriben distinto y no se detectan solos, como
          &quot;Mati Pavoni&quot; y &quot;Matias Pavoni&quot;.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-on-surface">
              Se queda
            </span>
            <select
              className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
              value={keepId}
              onChange={(e) => setKeepId(e.target.value)}
            >
              <option value="">Elegir jugador...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.dni ? ` (${formatDni(p.dni)})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-on-surface">
              Se absorbe y se borra
            </span>
            <select
              className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
              value={mergeId}
              onChange={(e) => setMergeId(e.target.value)}
            >
              <option value="">Elegir jugador...</option>
              {players
                .filter((p) => p.id !== keepId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.dni ? ` (${formatDni(p.dni)})` : ""}
                  </option>
                ))}
            </select>
          </label>
          <button
            onClick={() => {
              const keep = players.find((p) => p.id === keepId);
              const gone = players.find((p) => p.id === mergeId);
              if (!keep || !gone) return;
              if (
                confirm(
                  `"${gone.name}" se borra y todo su historial pasa a "${keep.name}". Esto no se puede deshacer. ¿Continuar?`
                )
              ) {
                merge(keepId, [mergeId]);
              }
            }}
            disabled={busy || !keepId || !mergeId}
            className="self-end rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
          >
            Fusionar
          </button>
        </div>
      </section>
    </div>
  );
}

function DuplicateGroupRow({
  group,
  busy,
  onMerge,
}: {
  group: DuplicateGroup;
  busy: boolean;
  onMerge: (keepId: string, mergeIds: string[]) => void;
}) {
  // Por defecto se conserva el más antiguo: es el que suele tener el historial.
  const [keepId, setKeepId] = useState(group.players[0]?.id ?? "");

  const keep = group.players.find((p) => p.id === keepId);
  const others = group.players.filter((p) => p.id !== keepId);

  return (
    <li className="rounded-md border border-surface-bright p-4">
      <p className="mb-2 font-medium text-on-surface">
        {group.players[0]?.name}{" "}
        <span className="text-sm font-normal text-on-surface-variant">
          · {group.players.length} registros
        </span>
      </p>

      <ul className="mb-3 flex flex-col gap-2">
        {group.players.map((player) => (
          <li key={player.id} className="flex items-start gap-2">
            <input
              type="radio"
              name={`keep-${group.nameKey}`}
              className="mt-1"
              checked={keepId === player.id}
              onChange={() => setKeepId(player.id)}
              disabled={!group.mergeable}
              id={`keep-${player.id}`}
            />
            <label htmlFor={`keep-${player.id}`} className="min-w-0 text-sm">
              <span className="text-on-surface">{player.name}</span>
              <span className="block text-xs text-on-surface-variant">
                {player.dni ? `DNI ${formatDni(player.dni)}` : "Sin DNI"} ·{" "}
                {player.tournamentCount} torneo
                {player.tournamentCount === 1 ? "" : "s"} ·{" "}
                {player.pairedTournamentCount === 0
                  ? "nunca jugó"
                  : `jugó ${player.pairedTournamentCount}`}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {group.mergeable ? (
        <button
          onClick={() => {
            if (!keep) return;
            if (
              confirm(
                `Se conserva "${keep.name}" y se borran los otros ${others.length} registro(s). Esto no se puede deshacer. ¿Continuar?`
              )
            ) {
              onMerge(
                keepId,
                others.map((p) => p.id)
              );
            }
          }}
          disabled={busy || others.length === 0}
          className="rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          Unificar en el elegido
        </button>
      ) : (
        <p className="rounded-md bg-surface-container-high px-3 py-2 text-sm text-on-surface-variant">
          No se pueden unificar: {group.blockedReason}
        </p>
      )}
    </li>
  );
}
