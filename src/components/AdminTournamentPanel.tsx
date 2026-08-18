"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  TournamentDetail,
  TournamentFormat,
  TournamentStatus,
} from "@/lib/types";
import { statusLabels, formatLabels, pairLabel } from "@/lib/types";
import BracketView from "@/components/BracketView";
import GroupsView from "@/components/GroupsView";

export default function AdminTournamentPanel({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const router = useRouter();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      setTournament(await res.json());
    } else {
      setError("No se pudo cargar el torneo");
    }
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount/id change
    load();
  }, [load]);

  async function withBusy<T>(fn: () => Promise<T>): Promise<T> {
    setError(null);
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }

  async function addPlayers(names: string[]): Promise<boolean> {
    const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al agregar jugadores");
      return false;
    }
    await load();
    return true;
  }

  async function removePlayer(playerId: string) {
    const res = await fetch(
      `/api/tournaments/${tournamentId}/players/${playerId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al quitar jugador");
      return;
    }
    await load();
  }

  async function drawPairs() {
    const res = await fetch(`/api/tournaments/${tournamentId}/draw-pairs`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al sortear parejas");
      return;
    }
    await load();
  }

  async function saveFinance(registrationFee: number, courtCost: number) {
    const res = await fetch(`/api/tournaments/${tournamentId}/finance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationFee, courtCost }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar los montos");
      return;
    }
    await load();
  }

  async function saveFormat(
    format: TournamentFormat,
    groupsCount?: number,
    qualifiersPerGroup?: number
  ) {
    const res = await fetch(`/api/tournaments/${tournamentId}/format`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, groupsCount, qualifiersPerGroup }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar el formato");
      return;
    }
    await load();
  }

  async function savePairs(pairs: { player1Id: string; player2Id: string }[]) {
    const res = await fetch(`/api/tournaments/${tournamentId}/pairs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar las parejas");
      return;
    }
    await load();
  }

  async function generateGroups() {
    const res = await fetch(
      `/api/tournaments/${tournamentId}/generate-groups`,
      { method: "POST" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al armar las zonas");
      return;
    }
    await load();
  }

  async function generateBracket() {
    const res = await fetch(
      `/api/tournaments/${tournamentId}/generate-bracket`,
      { method: "POST" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al armar el cuadro");
      return;
    }
    await load();
  }

  async function deleteTournament() {
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo borrar el torneo");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function resetTo(to: "SETUP" | "PAIRS_DONE" | "GROUP_STAGE") {
    const res = await fetch(`/api/tournaments/${tournamentId}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo volver a la etapa anterior");
      return;
    }
    await load();
  }

  async function pickWinner(matchId: string, winnerId: string) {
    setBusyMatchId(matchId);
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${matchId}/advance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winnerId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al registrar el ganador");
        return;
      }
      await load();
    } finally {
      setBusyMatchId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-on-surface-variant">
        Cargando...
      </div>
    );
  }
  if (!tournament) {
    return (
      <div className="p-12 text-center text-error">
        {error ?? "Torneo no encontrado"}
      </div>
    );
  }

  const status = tournament.status as TournamentStatus;
  const playerCount = tournament.players.length;
  const canDraw = status === "SETUP" && playerCount >= 4 && playerCount % 2 === 0;
  const canEditFormat = status === "SETUP" || status === "PAIRS_DONE";
  const canEditPairs = status === "PAIRS_DONE";
  const canGenerateGroups =
    tournament.format === "GROUPS_KO" &&
    status === "PAIRS_DONE" &&
    Boolean(tournament.groupsCount);
  const canGenerateBracket =
    (tournament.format === "SINGLE_ELIMINATION" &&
      status === "PAIRS_DONE" &&
      tournament.pairs.length >= 2) ||
    (tournament.format === "GROUPS_KO" &&
      status === "GROUP_STAGE" &&
      tournament.groups.every((g) => g.matches.every((m) => m.winner)));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm text-on-surface-variant hover:text-primary-fixed hover:underline"
          >
            ← Volver
          </Link>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            {tournament.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">
            {statusLabels[status]}
          </span>
          <Link
            href={`/torneos/${tournament.id}`}
            className="card-border rounded-lg bg-surface-container px-3 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-container-high"
          >
            Ver vista pública
          </Link>
          <button
            onClick={() => {
              if (
                confirm(
                  `¿Seguro que querés borrar el torneo "${tournament.name}"? Esta acción no se puede deshacer.`
                )
              ) {
                withBusy(deleteTournament);
              }
            }}
            disabled={busy}
            className="rounded-lg border border-error/40 bg-error-container/20 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/40 disabled:opacity-50"
          >
            Borrar torneo
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-md bg-error-container px-4 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      {/* Etapa 1: jugadores, sorteo y finanzas */}
      <PlayersSection
        tournament={tournament}
        canDraw={canDraw}
        busy={busy}
        onAdd={(names) => withBusy(() => addPlayers(names))}
        onRemove={(id) => withBusy(() => removePlayer(id))}
        onDraw={() => withBusy(drawPairs)}
        onReopen={() => {
          if (
            confirm(
              "Volver a editar jugadores borra las parejas, las zonas y el cuadro. ¿Continuar?"
            )
          )
            withBusy(() => resetTo("SETUP"));
        }}
      />

      <FinanceSection
        tournament={tournament}
        busy={busy}
        onSave={(fee, cost) => withBusy(() => saveFinance(fee, cost))}
      />

      {canEditFormat && (
        <FormatSection
          tournament={tournament}
          busy={busy}
          onSave={(format, groupsCount, qualifiersPerGroup) =>
            withBusy(() => saveFormat(format, groupsCount, qualifiersPerGroup))
          }
        />
      )}

      {tournament.pairs.length > 0 && (
        <PairsSection
          tournament={tournament}
          editable={canEditPairs}
          busy={busy}
          onSave={(pairs) => withBusy(() => savePairs(pairs))}
          onRedraw={() => {
            if (confirm("¿Volver a sortear las parejas al azar?"))
              withBusy(drawPairs);
          }}
        />
      )}

      {canGenerateGroups && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-3 text-lg font-semibold text-on-surface">
            Fase de grupos
          </h2>
          <p className="mb-3 text-sm text-on-surface-variant">
            Se reparten al azar {tournament.pairs.length} parejas en{" "}
            {tournament.groupsCount} zonas y se arma el fixture de todos
            contra todos de cada zona.
          </p>
          <button
            onClick={() => withBusy(generateGroups)}
            disabled={busy}
            className="rounded-md bg-primary-fixed px-4 py-2 font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
          >
            Armar zonas
          </button>
        </section>
      )}

      {tournament.groups.length > 0 && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-1 text-lg font-semibold text-on-surface">
            Fase de grupos
          </h2>
          <p className="mb-4 text-sm text-on-surface-variant">
            {status === "GROUP_STAGE"
              ? "Tocá la pareja ganadora de cada partido. Si te equivocás, tocá la otra para cambiarlo."
              : "La fase de grupos está cerrada (el cuadro final ya fue armado)."}
          </p>
          <GroupsView
            groups={tournament.groups}
            qualifiersPerGroup={tournament.qualifiersPerGroup ?? 1}
            editable={status === "GROUP_STAGE"}
            onPickWinner={pickWinner}
            busyMatchId={busyMatchId}
          />
          <div className="mt-4 border-t border-surface-bright pt-3">
            <button
              onClick={() => {
                if (
                  confirm(
                    "Esto borra las zonas y el cuadro para volver a la etapa de parejas y formato. ¿Continuar?"
                  )
                )
                  withBusy(() => resetTo("PAIRS_DONE"));
              }}
              disabled={busy}
              className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
            >
              ↩ Rehacer zonas o cambiar formato
            </button>
          </div>
        </section>
      )}

      {/* Etapa 2: cuadro */}
      {canGenerateBracket && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-3 text-lg font-semibold text-on-surface">
            Cuadro de eliminación
          </h2>
          <p className="mb-3 text-sm text-on-surface-variant">
            {tournament.format === "GROUPS_KO"
              ? `Se arma el cruce con los ${tournament.qualifiersPerGroup} clasificados de cada zona.`
              : `Se sortea el cruce de ${tournament.pairs.length} parejas al azar.`}
          </p>
          <button
            onClick={() => withBusy(generateBracket)}
            disabled={busy}
            className="rounded-md bg-primary-fixed px-4 py-2 font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
          >
            {tournament.format === "GROUPS_KO"
              ? "Armar cuadro final"
              : "Armar cuadro por sorteo"}
          </button>
        </section>
      )}

      {tournament.matches.length > 0 && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-1 text-lg font-semibold text-on-surface">
            Cuadro
          </h2>
          <p className="mb-4 text-sm text-on-surface-variant">
            Tocá la pareja ganadora de cada partido para que avance de ronda.
          </p>
          <BracketView
            matches={tournament.matches}
            onPickWinner={pickWinner}
            busyMatchId={busyMatchId}
          />
          <div className="mt-4 flex flex-wrap gap-4 border-t border-surface-bright pt-3">
            <button
              onClick={() => {
                const toGroups = tournament.groups.length > 0;
                if (
                  confirm(
                    toGroups
                      ? "Esto borra el cuadro final y vuelve a la fase de grupos (los resultados de las zonas se conservan). ¿Continuar?"
                      : "Esto borra el cuadro para volver a la etapa de parejas. ¿Continuar?"
                  )
                )
                  withBusy(() => resetTo(toGroups ? "GROUP_STAGE" : "PAIRS_DONE"));
              }}
              disabled={busy}
              className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
            >
              ↩ Rehacer cuadro
            </button>
            {tournament.groups.length > 0 && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Esto borra el cuadro y las zonas para volver a la etapa de parejas y formato. ¿Continuar?"
                    )
                  )
                    withBusy(() => resetTo("PAIRS_DONE"));
                }}
                disabled={busy}
                className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
              >
                ↩ Volver a parejas / formato
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function PlayersSection({
  tournament,
  canDraw,
  busy,
  onAdd,
  onRemove,
  onDraw,
  onReopen,
}: {
  tournament: TournamentDetail;
  canDraw: boolean;
  busy: boolean;
  onAdd: (names: string[]) => Promise<boolean>;
  onRemove: (id: string) => void;
  onDraw: () => void;
  onReopen: () => void;
}) {
  const [bulkNames, setBulkNames] = useState("");
  const editable = tournament.status === "SETUP";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    // Sólo limpiamos el campo si se agregaron bien (si no, no perdés lo escrito).
    const ok = await onAdd(names);
    if (ok) setBulkNames("");
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-on-surface">Jugadores</h2>
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

      {editable && (
        <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
          <textarea
            className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            rows={3}
            placeholder={"Un nombre por línea, ej:\nJuan Pérez\nAna Gómez"}
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="self-start rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
          >
            Agregar jugadores
          </button>
        </form>
      )}

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
        <button
          onClick={onDraw}
          disabled={!canDraw || busy}
          className="rounded-md bg-primary-fixed px-4 py-2 font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          Sortear parejas
        </button>
      )}
      {editable && !canDraw && (
        <p className="mt-2 text-sm text-on-surface-variant">
          Necesitás una cantidad par de jugadores (mínimo 4) para sortear.
        </p>
      )}
    </section>
  );
}

function FinanceSection({
  tournament,
  busy,
  onSave,
}: {
  tournament: TournamentDetail;
  busy: boolean;
  onSave: (fee: number, cost: number) => void;
}) {
  const [fee, setFee] = useState(tournament.registrationFee ?? "");
  const [cost, setCost] = useState(tournament.courtCost ?? "");

  const feeNum = Number(fee) || 0;
  const costNum = Number(cost) || 0;
  const prize = feeNum * tournament.players.length - costNum;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(feeNum, costNum);
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <h2 className="mb-3 text-lg font-semibold text-on-surface">
        Inscripción y premio
      </h2>
      <form
        onSubmit={handleSubmit}
        className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-on-surface">
            Inscripción por jugador ($)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-on-surface">
            Costo total de canchas ($)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50 sm:col-span-2 sm:w-fit"
        >
          Guardar montos
        </button>
      </form>
      <p className="text-sm text-on-surface-variant">
        Recaudado:{" "}
        <strong className="text-on-surface">
          ${(feeNum * tournament.players.length).toFixed(2)}
        </strong>{" "}
        ({tournament.players.length} jugadores) — Canchas:{" "}
        <strong className="text-on-surface">${costNum.toFixed(2)}</strong>
      </p>
      <p className="mt-1 text-lg font-semibold text-primary-fixed">
        Premio: ${prize.toFixed(2)}
      </p>
    </section>
  );
}

function FormatSection({
  tournament,
  busy,
  onSave,
}: {
  tournament: TournamentDetail;
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (format === "GROUPS_KO") {
      onSave(format, Number(groupsCount), Number(qualifiersPerGroup));
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-on-surface">
                Cantidad de zonas
              </span>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
                value={groupsCount}
                onChange={(e) => setGroupsCount(e.target.value)}
              />
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
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          Guardar formato
        </button>
      </form>
    </section>
  );
}

function PairsSection({
  tournament,
  editable,
  busy,
  onSave,
  onRedraw,
}: {
  tournament: TournamentDetail;
  editable: boolean;
  busy: boolean;
  onSave: (pairs: { player1Id: string; player2Id: string }[]) => void;
  onRedraw: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<[string, string][]>([]);

  function startEditing() {
    setDraft(tournament.pairs.map((p) => [p.player1.id, p.player2.id]));
    setEditing(true);
  }

  // Cambia un jugador de una pareja. Si el jugador elegido ya estaba en otra
  // posición, se intercambia con el que ocupaba este lugar, de modo que todos
  // los jugadores queden siempre repartidos en parejas.
  function updateSlot(pairIndex: number, slot: 0 | 1, playerId: string) {
    setDraft((prev) => {
      const next = prev.map((pair) => [...pair] as [string, string]);
      const displaced = next[pairIndex][slot];
      if (displaced === playerId) return prev;

      outer: for (let i = 0; i < next.length; i++) {
        for (let s = 0 as 0 | 1; s <= 1; s = (s + 1) as 0 | 1) {
          if (next[i][s] === playerId) {
            next[i][s] = displaced;
            break outer;
          }
        }
      }
      next[pairIndex][slot] = playerId;
      return next;
    });
  }

  function handleSave() {
    onSave(
      draft.map(([player1Id, player2Id]) => ({ player1Id, player2Id }))
    );
    setEditing(false);
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-on-surface">
          Parejas sorteadas
        </h2>
        {editable && !editing && (
          <div className="flex items-center gap-3">
            <button
              onClick={onRedraw}
              disabled={busy}
              className="text-sm font-medium text-on-surface-variant hover:text-primary-fixed hover:underline disabled:opacity-50"
            >
              🎲 Re-sortear
            </button>
            <button
              onClick={startEditing}
              className="text-sm font-medium text-primary-fixed hover:underline"
            >
              Editar parejas
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-on-surface-variant">
            Elegí un jugador en cualquier posición: si ya estaba en otra
            pareja, se intercambian automáticamente.
          </p>
          {draft.map(([player1Id, player2Id], i) => {
            return (
              <div
                key={i}
                className="grid grid-cols-1 items-center gap-2 rounded-md bg-surface-container-high p-2 sm:grid-cols-[1fr_auto_1fr]"
              >
                <select
                  className="rounded-md border border-surface-bright bg-surface-dim px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary-fixed"
                  value={player1Id}
                  onChange={(e) => updateSlot(i, 0, e.target.value)}
                >
                  {tournament.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="text-center text-sm text-on-surface-variant">
                  &amp;
                </span>
                <select
                  className="rounded-md border border-surface-bright bg-surface-dim px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary-fixed"
                  value={player2Id}
                  onChange={(e) => updateSlot(i, 1, e.target.value)}
                >
                  {tournament.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={busy}
              className="rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
            >
              Guardar parejas
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={busy}
              className="rounded-md border border-surface-bright px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </section>
  );
}

