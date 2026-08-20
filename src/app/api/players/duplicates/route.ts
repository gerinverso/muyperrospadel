import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { checkMerge } from "@/lib/players";
import { MERGE_CANDIDATE_SELECT, toMergeCandidate } from "@/lib/player-merge";

/**
 * Grupos de jugadores que comparten el nombre normalizado, o sea los candidatos
 * a ser la misma persona cargada dos veces.
 *
 * Aparecen solos apenas alguien se auto-inscribe con un nombre que ya estaba en
 * la base: la inscripcion publica crea un jugador nuevo a proposito, y la
 * unificacion se decide aca.
 *
 * Los grupos que ninguna fusion podria arreglar (dos DNI distintos, o los dos
 * jugaron el mismo torneo en parejas distintas) se devuelven igual, marcados y
 * con el motivo: esconderlos daria a entender que no hay nada para revisar.
 */
export async function GET() {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const repeated = await prisma.player.groupBy({
    by: ["nameKey"],
    _count: { nameKey: true },
    having: { nameKey: { _count: { gt: 1 } } },
  });

  if (repeated.length === 0) return NextResponse.json([]);

  const players = await prisma.player.findMany({
    where: { nameKey: { in: repeated.map((r) => r.nameKey) } },
    select: MERGE_CANDIDATE_SELECT,
    orderBy: [{ nameKey: "asc" }, { createdAt: "asc" }],
  });

  const byKey = new Map<string, typeof players>();
  for (const player of players) {
    const group = byKey.get(player.nameKey) ?? [];
    group.push(player);
    byKey.set(player.nameKey, group);
  }

  const groups = [...byKey.entries()].map(([nameKey, rows]) => {
    const candidates = rows.map(toMergeCandidate);

    // Un grupo es fusionable si al menos un par lo es. Con mas de dos jugadores
    // alcanza con que haya una fusion posible: las demas se resuelven de a una.
    let blockedReason: string | null = null;
    let mergeable = false;
    for (let i = 0; i < candidates.length && !mergeable; i++) {
      for (let j = i + 1; j < candidates.length && !mergeable; j++) {
        const check = checkMerge(candidates[i], candidates[j]);
        if (check.ok) mergeable = true;
        else blockedReason ??= check.message;
      }
    }

    return {
      nameKey,
      mergeable,
      blockedReason: mergeable ? null : blockedReason,
      players: rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        dni: row.dni,
        createdAt: row.createdAt,
        tournamentCount: row.tournaments.length,
        pairedTournamentCount: candidates[index].pairedTournaments.length,
      })),
    };
  });

  return NextResponse.json(groups);
}
