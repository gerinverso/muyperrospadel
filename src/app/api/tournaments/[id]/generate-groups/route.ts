import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { distributeGroups, roundRobinMatches } from "@/lib/groups";
import { loadTournamentDetail } from "@/lib/tournament-query";

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Arma las zonas y el fixture de todos contra todos de cada una.
 *
 * Con `groups` en el body se usa exactamente el reparto que confirmó el
 * organizador (puede tener zonas de distinto tamaño); sin body se reparte al
 * azar lo más parejo posible. Se valida que no falte ni sobre ninguna pareja
 * para que la fase de grupos no arranque con un reparto a medias.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { pairs: { select: { id: true } } },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (tournament.format !== "GROUPS_KO") {
    return NextResponse.json(
      { error: "El torneo no usa formato de fase de grupos" },
      { status: 409 }
    );
  }
  if (tournament.status !== "PAIRS_DONE") {
    return NextResponse.json(
      { error: "Las zonas ya fueron armadas o todavía no se definieron las parejas" },
      { status: 409 }
    );
  }
  const groupsCount = tournament.groupsCount;
  if (!groupsCount) {
    return NextResponse.json(
      { error: "Definí la cantidad de zonas antes de armarlas" },
      { status: 400 }
    );
  }
  const allPairIds = tournament.pairs.map((p) => p.id);
  if (allPairIds.length < groupsCount * 2) {
    return NextResponse.json(
      { error: "No hay parejas suficientes para armar esas zonas" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  let groupedPairIds: string[][];

  if (Array.isArray(body?.groups)) {
    const proposed: string[][] = [];
    for (const group of body.groups) {
      const pairIds = group?.pairIds;
      if (!Array.isArray(pairIds) || pairIds.some((p) => typeof p !== "string")) {
        return NextResponse.json(
          { error: "Reparto de zonas inválido" },
          { status: 400 }
        );
      }
      proposed.push(pairIds);
    }

    if (proposed.length !== groupsCount) {
      return NextResponse.json(
        { error: `El reparto tiene ${proposed.length} zonas y el torneo está configurado con ${groupsCount}` },
        { status: 400 }
      );
    }
    const small = proposed.findIndex((pairIds) => pairIds.length < 2);
    if (small !== -1) {
      return NextResponse.json(
        { error: `La ${zoneName(small)} tiene menos de 2 parejas: no se puede jugar` },
        { status: 400 }
      );
    }
    const assigned = proposed.flat();
    if (
      assigned.length !== allPairIds.length ||
      new Set(assigned).size !== allPairIds.length ||
      assigned.some((pairId) => !allPairIds.includes(pairId))
    ) {
      return NextResponse.json(
        { error: "Cada pareja del torneo tiene que estar en una zona, y en una sola" },
        { status: 400 }
      );
    }
    groupedPairIds = proposed;
  } else {
    groupedPairIds = distributeGroups(allPairIds, groupsCount);
  }

  let slotCounter = 0;
  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < groupedPairIds.length; index++) {
      const pairIds = groupedPairIds[index];
      const group = await tx.group.create({
        data: { tournamentId: id, index, name: zoneName(index) },
      });

      await tx.pair.updateMany({
        where: { id: { in: pairIds } },
        data: { groupId: group.id },
      });

      await tx.match.createMany({
        data: roundRobinMatches(pairIds).map(([pairAId, pairBId]) => ({
          tournamentId: id,
          groupId: group.id,
          round: 0,
          slot: slotCounter++,
          pairAId,
          pairBId,
        })),
      });
    }

    await tx.tournament.update({
      where: { id },
      data: { status: "GROUP_STAGE" },
    });
  });

  return NextResponse.json(await loadTournamentDetail(id));
}

function zoneName(index: number): string {
  return `Zona ${GROUP_LETTERS[index] ?? index + 1}`;
}
