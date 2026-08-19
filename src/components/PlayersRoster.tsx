"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlayerWithStats } from "@/lib/types";
import { formatDni } from "@/lib/players";

export default function PlayersRoster() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newDni, setNewDni] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/players", { cache: "no-store" });
    if (res.ok) setPlayers(await res.json());
    else setError("No se pudo cargar el listado de jugadores");
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load();
  }, [load]);

  async function request(
    url: string,
    options: RequestInit,
    fallbackError: string
  ): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? fallbackError);
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const ok = await request(
      "/api/players",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, dni: newDni }),
      },
      "No se pudo crear el jugador"
    );
    if (ok) {
      setNewName("");
      setNewDni("");
    }
  }

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-12 text-center text-on-surface-variant">Cargando...</div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      {error && (
        <p className="rounded-md bg-error-container px-4 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <section className="card-border rounded-lg bg-surface-container p-5">
        <h2 className="mb-3 text-lg font-semibold text-on-surface">
          Agregar jugador
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]"
        >
          <input
            className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            placeholder="Nombre y apellido"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            placeholder="DNI (opcional)"
            inputMode="numeric"
            value={newDni}
            onChange={(e) => setNewDni(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary-fixed px-4 py-2 font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
        <p className="mt-2 text-xs text-on-surface-variant">
          El DNI es opcional por ahora. Más adelante va a ser el identificador
          único de cada jugador.
        </p>
      </section>

      <section className="card-border rounded-lg bg-surface-container p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-on-surface">
            Jugadores del club ({players.length})
          </h2>
          <input
            className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-fixed"
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            {players.length === 0
              ? "Todavía no hay jugadores cargados."
              : "Ningún jugador coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-surface-bright/60">
            {filtered.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                busy={busy}
                editing={editingId === player.id}
                onEdit={() => setEditingId(player.id)}
                onCancel={() => setEditingId(null)}
                onSave={async (name, dni) => {
                  const ok = await request(
                    `/api/players/${player.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, dni }),
                    },
                    "No se pudo guardar el jugador"
                  );
                  if (ok) setEditingId(null);
                }}
                onDelete={() =>
                  request(
                    `/api/players/${player.id}`,
                    { method: "DELETE" },
                    "No se pudo borrar el jugador"
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Formulario de edición. Vive en su propio componente para que se monte de
 * cero cada vez que se entra a editar: así no arrastra lo que se haya tipeado
 * en una edición anterior que se canceló.
 */
function PlayerEditForm({
  player,
  busy,
  onCancel,
  onSave,
}: {
  player: PlayerWithStats;
  busy: boolean;
  onCancel: () => void;
  onSave: (name: string, dni: string) => void;
}) {
  const [name, setName] = useState(player.name);
  const [dni, setDni] = useState(player.dni ?? "");

  return (
    <li className="grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-[2fr_1fr_auto]">
      <input
        className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-fixed"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={`Nombre de ${player.name}`}
      />
      <input
        className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-fixed"
        placeholder="DNI (opcional)"
        inputMode="numeric"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
        aria-label={`DNI de ${player.name}`}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(name, dni)}
          disabled={busy}
          className="rounded-md bg-primary-fixed px-3 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-surface-bright px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high"
        >
          Cancelar
        </button>
      </div>
    </li>
  );
}

function PlayerRow({
  player,
  busy,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  player: PlayerWithStats;
  busy: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (name: string, dni: string) => void;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <PlayerEditForm
        player={player}
        busy={busy}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
  }

  const played = player._count.tournaments;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-on-surface">{player.name}</p>
        <p className="text-xs text-on-surface-variant">
          {formatDni(player.dni) ? `DNI ${formatDni(player.dni)} · ` : ""}
          {played === 0
            ? "Sin torneos jugados"
            : `${played} torneo${played === 1 ? "" : "s"}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={onEdit}
          className="text-sm font-medium text-primary-fixed hover:underline"
        >
          Editar
        </button>
        {played === 0 && (
          <button
            onClick={() => {
              if (confirm(`¿Borrar a "${player.name}" del listado del club?`)) {
                onDelete();
              }
            }}
            disabled={busy}
            className="text-sm font-medium text-on-surface-variant hover:text-error disabled:opacity-50"
          >
            Borrar
          </button>
        )}
      </div>
    </li>
  );
}
