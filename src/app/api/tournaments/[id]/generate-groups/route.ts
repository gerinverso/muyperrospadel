import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { distributeGroups, roundRobinMatches } from "@/lib/groups";

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { pairs: true },
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
      { error: "Las zonas ya fueron armadas o todavía no se sortearon las parejas" },
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
  if (tournament.pairs.length < groupsCount * 2) {
    return NextResponse.json(
      { error: "No hay parejas suficientes para armar esas zonas" },
      { status: 400 }
    );
  }

  const groupedPairIds = distributeGroups(
    tournament.pairs.map((p) => p.id),
    groupsCount
  );

  let slotCounter = 0;
  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < groupedPairIds.length; index++) {
      const pairIds = groupedPairIds[index];
      const group = await tx.group.create({
        data: {
          tournamentId: id,
          index,
          name: `Zona ${GROUP_LETTERS[index] ?? index + 1}`,
        },
      });

      await tx.pair.updateMany({
        where: { id: { in: pairIds } },
        data: { groupId: group.id },
      });

      const fixtures = roundRobinMatches(pairIds);
      for (const [pairAId, pairBId] of fixtures) {
        await tx.match.create({
          data: {
            tournamentId: id,
            groupId: group.id,
            round: 0,
            slot: slotCounter++,
            pairAId,
            pairBId,
          },
        });
      }
    }

    await tx.tournament.update({
      where: { id },
      data: { status: "GROUP_STAGE" },
    });
  });

  const updated = await prisma.tournament.findUnique({
    where: { id },
    relationLoadStrategy: "join",
    include: {
      groups: {
        orderBy: { index: "asc" },
        include: {
          pairs: { include: { player1: true, player2: true } },
          matches: {
            orderBy: { slot: "asc" },
            include: {
              pairA: { include: { player1: true, player2: true } },
              pairB: { include: { player1: true, player2: true } },
              winner: { include: { player1: true, player2: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
