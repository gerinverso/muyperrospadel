"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  PairingMode,
  TournamentDetail,
  TournamentFormat,
  TournamentStatus,
} from "@/lib/types";
import { pairLabel, statusLabels } from "@/lib/types";
import { computeQualifiers, toGroupMatchResults } from "@/lib/groups";
import { bracketPlan } from "@/lib/bracket";
import BracketView from "@/components/BracketView";
import GroupsView, { type GroupSettings } from "@/components/GroupsView";
import PlayersSection from "@/components/admin/PlayersSection";
import RegistrationSection from "@/components/admin/RegistrationSection";
import FinanceSection from "@/components/admin/FinanceSection";
import FormatSection from "@/components/admin/FormatSection";
import PairingSection from "@/components/admin/PairingSection";
import ZoneDraftSection from "@/components/admin/ZoneDraftSection";

/**
 * Cuántas parejas clasifican con la configuración actual de las zonas y de qué
 * tamaño queda el cuadro. Usa la misma función que el servidor, así lo que
 * anuncia el panel es exactamente lo que se va a armar.
 */
function qualifierSummary(tournament: TournamentDetail) {
  const zones = computeQualifiers(
    tournament.groups.map((group) => ({
      id: group.id,
      index: group.index,
      pairIds: group.pairs.map((p) => p.id),
      matches: toGroupMatchResults(group.matches),
      qualifiers: group.qualifiers,
      tiebreakOrder: group.tiebreakOrder,
    })),
    tournament.qualifiersPerGroup ?? 1
  );
  const count = zones.reduce((total, zone) => total + zone.qualifiers, 0);
  const bracketSize = count >= 2 ? 2 ** Math.ceil(Math.log2(count)) : 0;
  return { count, bracketSize, byes: Math.max(0, bracketSize - count) };
}

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
  const [formatWarnings, setFormatWarnings] = useState<string[]>([]);
  // Quien pasa libre cuando el sorteo es de una cantidad impar de parejas.
  const [byePairId, setByePairId] = useState("");

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

  /**
   * Todas las acciones del panel son POST a un endpoint del torneo que
   * devuelven el torneo actualizado. Este helper concentra el manejo de error y
   * la recarga: antes cada acción repetía las mismas quince líneas.
   */
  const send = useCallback(
    async (
      path: string,
      body?: unknown,
      errorMessage = "No se pudo completar la acción"
    ): Promise<Record<string, unknown> | null> => {
      setError(null);
      setBusy(true);
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}${path}`, {
          method: "POST",
          headers:
            body === undefined ? undefined : { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? errorMessage);
          return null;
        }
        await load();
        return data ?? {};
      } finally {
        setBusy(false);
      }
    },
    [tournamentId, load]
  );

  async function addPlayers(payload: {
    names?: string[];
    playerIds?: string[];
  }): Promise<boolean> {
    const data = await send("/players", payload, "Error al agregar jugadores");
    return data !== null;
  }

  async function removePlayer(playerId: string) {
    setError(null);
    setBusy(true);
    try {
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
    } finally {
      setBusy(false);
    }
  }

  async function savePairs(
    pairs: [string, string][],
    drawRest: boolean,
    mode: PairingMode
  ) {
    await send(
      "/pairs",
      { pairs, drawRest, mode },
      "Error al guardar las parejas"
    );
  }

  async function saveFormat(
    format: TournamentFormat,
    groupsCount?: number,
    qualifiersPerGroup?: number
  ) {
    const data = await send(
      "/format",
      { format, groupsCount, qualifiersPerGroup },
      "Error al guardar el formato"
    );
    setFormatWarnings(
      Array.isArray(data?.warnings) ? (data.warnings as string[]) : []
    );
  }

  async function saveRegistration(payload: {
    startsAt?: string | null;
    registrationOpen?: boolean;
  }) {
    const data = await send(
      "/registration",
      payload,
      "Error al guardar las inscripciones"
    );
    // El anuncio vive en el layout, fuera de este componente: sin refresh
    // seguiría mostrando el estado viejo.
    if (data) router.refresh();
  }

  async function pickWinner(matchId: string, winnerId: string) {
    setBusyMatchId(matchId);
    try {
      await send(
        `/matches/${matchId}/advance`,
        { winnerId },
        "Error al registrar el ganador"
      );
    } finally {
      setBusyMatchId(null);
    }
  }

  async function deleteTournament() {
    setBusy(true);
    try {
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
    } finally {
      setBusy(false);
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
  const pairCount = tournament.pairs.length;
  const inPairsStage = status === "SETUP" || status === "PAIRS_DONE";

  const showPairing = pairCount > 0 || (status === "SETUP" && playerCount >= 4);
  const showZoneDraft =
    tournament.format === "GROUPS_KO" &&
    status === "PAIRS_DONE" &&
    Boolean(tournament.groupsCount) &&
    pairCount >= (tournament.groupsCount ?? 0) * 2;
  const groupStageDone =
    tournament.groups.length > 0 &&
    tournament.groups.every((g) => g.matches.every((m) => m.winner));
  const canGenerateBracket =
    (tournament.format === "SINGLE_ELIMINATION" &&
      status === "PAIRS_DONE" &&
      pairCount >= 2) ||
    (tournament.format === "GROUPS_KO" &&
      status === "GROUP_STAGE" &&
      groupStageDone);
  const summary = qualifierSummary(tournament);
  // El cuadro se arma con los clasificados (fase de grupos) o con todas las
  // parejas (eliminacion directa).
  const bracketPairCount =
    tournament.format === "GROUPS_KO" ? summary.count : pairCount;
  const plan = bracketPlan(Math.max(bracketPairCount, 2));

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
                deleteTournament();
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

      {/* Etapa 0: anuncio del torneo y auto-inscripcion de los jugadores */}
      <RegistrationSection
        tournament={tournament}
        busy={busy}
        onSave={saveRegistration}
      />

      {/* Etapa 1: jugadores, parejas y finanzas */}
      <PlayersSection
        tournament={tournament}
        busy={busy}
        onAdd={addPlayers}
        onRemove={removePlayer}
        onReopen={() => {
          if (
            confirm(
              "Volver a editar jugadores borra las parejas, las zonas y el cuadro. ¿Continuar?"
            )
          )
            send("/reset", { to: "SETUP" });
        }}
      />

      <FinanceSection
        tournament={tournament}
        busy={busy}
        onSave={(registrationFee, courtCost) =>
          send(
            "/finance",
            { registrationFee, courtCost },
            "Error al guardar los montos"
          )
        }
      />

      {showPairing && (
        <PairingSection
          // Al cambiar las parejas guardadas el borrador tiene que arrancar de
          // nuevo desde la base: remontar es más simple que sincronizar.
          key={tournament.pairs.map((p) => p.id).join("-")}
          tournament={tournament}
          editable={inPairsStage}
          busy={busy}
          onSave={savePairs}
        />
      )}

      {inPairsStage && (
        <FormatSection
          tournament={tournament}
          warnings={formatWarnings}
          busy={busy}
          onSave={saveFormat}
        />
      )}

      {showZoneDraft && (
        <ZoneDraftSection
          // Si cambia la cantidad de zonas hay que repartir de nuevo.
          key={`${tournament.groupsCount}-${pairCount}`}
          tournament={tournament}
          busy={busy}
          onGenerate={(groups) =>
            send(
              "/generate-groups",
              { groups: groups.map((pairIds) => ({ pairIds })) },
              "Error al armar las zonas"
            )
          }
        />
      )}

      {tournament.groups.length > 0 && (
        <section className="card-border rounded-lg bg-surface-container p-5">
          <h2 className="mb-1 text-lg font-semibold text-on-surface">
            Fase de grupos
          </h2>
          <p className="mb-4 text-sm text-on-surface-variant">
            {status === "GROUP_STAGE"
              ? "Tocá la pareja ganadora de cada partido. Si te equivocás, tocá la otra para cambiarlo. Con las flechas ordenás a mano los empates que la cancha no resolvió."
              : "La fase de grupos está cerrada (el cuadro final ya fue armado)."}
          </p>
          <GroupsView
            groups={tournament.groups}
            qualifiersPerGroup={tournament.qualifiersPerGroup ?? 1}
            editable={status === "GROUP_STAGE"}
            onPickWinner={pickWinner}
            onSaveGroup={(groupId: string, settings: GroupSettings) =>
              send(
                `/groups/${groupId}`,
                settings,
                "No se pudo guardar el cambio en la zona"
              )
            }
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
                  send("/reset", { to: "PAIRS_DONE" });
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
              ? `Clasifican ${summary.count} parejas: ${plan.firstRoundMatches} partido(s) en la primera ronda`
              : `Se sortea el cruce de ${pairCount} parejas: ${plan.firstRoundMatches} partido(s) en la primera ronda`}
            {plan.firstRoundDirect > 0 &&
              (tournament.format === "GROUPS_KO"
                ? ` y ${plan.firstRoundDirect === 1 ? "la mejor pasa" : `las ${plan.firstRoundDirect} mejores pasan`} libre`
                : ` y ${plan.firstRoundDirect === 1 ? "una pasa" : `${plan.firstRoundDirect} pasan`} libre`)}
            {`. ${plan.totalMatches} partidos en total.`}
            {tournament.format === "GROUPS_KO" &&
              " Las parejas de la misma zona no se cruzan en la primera ronda."}
          </p>

          {plan.byes > 0 && (
            <p className="mb-3 rounded-md bg-surface-dim px-3 py-2 text-sm text-on-surface-variant">
              Con {bracketPairCount} parejas hay {plan.byes} pase
              {plan.byes === 1 ? "" : "s"} libre{plan.byes === 1 ? "" : "s"},
              todos en la primera ronda. De ahí en adelante el cuadro es exacto:
              nadie pasa de largo en cuartos, semifinal ni final.
            </p>
          )}

          {tournament.format === "SINGLE_ELIMINATION" &&
            plan.firstRoundDirect > 0 && (
              <label className="mb-3 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                Pasa libre en la primera ronda:
                <select
                  value={byePairId}
                  onChange={(e) => setByePairId(e.target.value)}
                  className="rounded-md border border-surface-bright bg-surface-dim px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary-fixed"
                >
                  <option value="">La que salga en el sorteo</option>
                  {tournament.pairs.map((pair) => (
                    <option key={pair.id} value={pair.id}>
                      {pairLabel(pair)}
                    </option>
                  ))}
                </select>
              </label>
            )}

          <button
            onClick={() =>
              send(
                "/generate-bracket",
                byePairId ? { byePairId } : {},
                "Error al armar el cuadro"
              )
            }
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
          <h2 className="mb-1 text-lg font-semibold text-on-surface">Cuadro</h2>
          <p className="mb-4 text-sm text-on-surface-variant">
            Tocá la pareja ganadora de cada partido para que avance de ronda. Las
            que pasaron libres ya están puestas en la ronda siguiente.
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
                  send("/reset", { to: toGroups ? "GROUP_STAGE" : "PAIRS_DONE" });
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
                    send("/reset", { to: "PAIRS_DONE" });
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
