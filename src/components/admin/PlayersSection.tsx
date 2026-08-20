"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlayerWithStats, TournamentDetail } from "@/lib/types";

export default function PlayersSection({
  tournament,
  busy,
  onAdd,
  onRemove,
  onReopen,
}: {
  tournament: TournamentDetail;
  busy: boolean;
  onAdd: (payload: {
    names?: string[];
    playerIds?: string[];
  }) => Promise<boolean>;
  onRemove: (id: string) => void;
  onReopen: () => void;
}) {
  const [bulkNames, setBulkNames] = useState("");
  const [roster, setRoster] = useState<PlayerWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const editable = tournament.status === "SETUP";

  const loadRoster = useCallback(async () => {
    const res = await fetch("/api/players", { cache: "no-store" });
    if (res.ok) setRoster(await res.json());
  }, []);

  useEffect(() => {
    if (!editable) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del listado
    loadRoster();
  }, [editable, loadRoster]);

  const enrolledIds = new Set(tournament.players.map((p) => p.id));
  const available = roster
    .filter((p) => !enrolledIds.has(p.id))
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function handleAddFromRoster(playerId: string) {
    const ok = await onAdd({ playerIds: [playerId] });
    if (ok) await loadRoster();
  }

  async function handleAddNew(e: React.FormEvent) {
    e.preventDefault();
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    // Sólo limpiamos el campo si se agregaron bien (si no, no perdés lo escrito).
    const ok = await onAdd({ names });
    if (ok) {
      setBulkNames("");
      setShowNewForm(false);
      await loadRoster();
    }
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-on-surface">
          Jugadores anotados ({tournament.players.length})
        </h2>
        {!editable && (
          <button
            onClick={onReopen}
            disabled={busy}
            className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
          >
            ↩ Volver a editar jugadores
          </button>
        )}
      </div>

      <ul className="mb-4 flex flex-wrap gap-2">
        {tournament.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1 text-sm text-on-surface"
          >
            {p.name}
            {editable && (
              <button
                onClick={() => onRemove(p.id)}
                disabled={busy}
                aria-label={`Quitar a ${p.name}`}
                className="text-on-surface-variant hover:text-error"
              >
                ×
              </button>
            )}
          </li>
        ))}
        {tournament.players.length === 0 && (
          <li className="text-sm text-on-surface-variant">
            Sin jugadores todavía.
          </li>
        )}
      </ul>

      {editable && (
        <div className="mb-4 rounded-md border border-surface-bright bg-surface-dim p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-on-surface">
              Anotar del listado del club
            </h3>
            <input
              className="rounded-md border border-surface-bright bg-surface-container px-3 py-1.5 text-sm text-on-surface outline-none focus:border-primary-fixed"
              placeholder="Buscar jugador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {available.length === 0 ? (
            <p className="py-2 text-sm text-on-surface-variant">
              {roster.length === enrolledIds.size
                ? "Ya están anotados todos los jugadores del club."
                : "Ningún jugador coincide con la búsqueda."}
            </p>
          ) : (
            <ul className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
              {available.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleAddFromRoster(p.id)}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-full border border-surface-bright px-3 py-1 text-sm text-on-surface transition-colors hover:border-primary-fixed hover:text-primary-fixed disabled:opacity-50"
                  >
                    <span className="text-primary-fixed">+</span>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 border-t border-surface-bright pt-3">
            {showNewForm ? (
              <form onSubmit={handleAddNew} className="flex flex-col gap-2">
                <textarea
                  className="rounded-md border border-surface-bright bg-surface-container px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
                  rows={3}
                  placeholder={
                    "Un nombre por línea, ej:\nJuan Pérez\nAna Gómez"
                  }
                  value={bulkNames}
                  onChange={(e) => setBulkNames(e.target.value)}
                />
                <p className="text-xs text-on-surface-variant">
                  Se guardan en el listado del club y quedan disponibles para
                  los próximos torneos. Si el nombre ya existe, se reutiliza.
                </p>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
                  >
                    Agregar y anotar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="rounded-md border border-surface-bright px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="text-sm font-medium text-primary-fixed hover:underline"
              >
                + Jugador nuevo (no está en el listado)
              </button>
            )}
          </div>
        </div>
      )}

    </section>
  );
}
