import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { generateBracket, seedBracket, nextMatchPosition } from "@/lib/bracket";
import { computeGroupStandings } from "@/lib/groups";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      pairs: true,
      groups: {
        orderBy: { index: "asc" },
        include: { pairs: true, matches: true },
      },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  let qualifierIds: string[];

  if (tournament.format === "GROUPS_KO") {
    if (tournament.status !== "GROUP_STAGE") {
      return NextResponse.json(
        {
          error:
            "El cuadro final ya fue generado o todavía no se armaron las zonas",
        },
        { status: 409 }
      );
    }
    const pendingMatch = tournament.groups
      .flatMap((g) => g.matches)
      .find((m) => !m.winnerId);
    if (pendingMatch) {
      return NextResponse.json(
        { error: "Todavía hay partidos de la fase de grupos sin resultado" },
        { status: 409 }
      );
    }

    const qualifiersPerGroup = tournament.qualifiersPerGroup ?? 1;
    const standingsPerGroup = tournament.groups.map((group) =>
      computeGroupStandings(
        group.pairs.map((p) => p.id),
        group.matches
      )
    );

    // Se intercalan los clasificados por puesto (todos los 1eros, luego los
    // 2dos, etc.) para que el seed de cuadro cruce zonas distintas primero.
    qualifierIds = [];
    for (let rank = 0; rank < qualifiersPerGroup; rank++) {
      for (const standings of standingsPerGroup) {
        const row = standings[rank];
        if (row) qualifierIds.push(row.pairId);
      }
    }

    if (qualifierIds.length < 2) {
      return NextResponse.json(
        { error: "No hay suficientes clasificados para armar el cuadro" },
        { status: 400 }
      );
    }
  } else {
    if (tournament.status !== "PAIRS_DONE") {
      return NextResponse.json(
        {
          error:
            "El cuadro ya fue generado o todavía no se sortearon las parejas",
        },
        { status: 409 }
      );
    }
    if (tournament.pairs.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 parejas para armar el cuadro" },
        { status: 400 }
      );
    }
    qualifierIds = tournament.pairs.map((p) => p.id);
  }

  const slots =
    tournament.format === "GROUPS_KO"
      ? seedBracket(qualifierIds)
      : generateBracket(qualifierIds);

  await prisma.$transaction([
    ...slots.map((s) =>
      prisma.match.create({
        data: {
          tournamentId: id,
          round: s.round,
          slot: s.slot,
          pairAId: s.pairAId,
          pairBId: s.pairBId,
          winnerId: s.winnerId,
        },
      })
    ),
    prisma.tournament.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    }),
  ]);

  // Propaga los "byes" (pases libres) de la primera ronda hacia la siguiente.
  const byes = slots.filter((s) => s.round === 1 && s.winnerId);
  for (const bye of byes) {
    await propagateWinner(id, bye.round, bye.slot, bye.winnerId!);
  }

  const updated = await prisma.tournament.findUnique({
    where: { id },
    include: {
      matches: {
        where: { groupId: null },
        orderBy: [{ round: "asc" }, { slot: "asc" }],
        include: {
          pairA: { include: { player1: true, player2: true } },
          pairB: { include: { player1: true, player2: true } },
          winner: { include: { player1: true, player2: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

async function propagateWinner(
  tournamentId: string,
  round: number,
  slot: number,
  winnerId: string
) {
  const totalRounds = await prisma.match.aggregate({
    where: { tournamentId, groupId: null },
    _max: { round: true },
  });
  if (round >= (totalRounds._max.round ?? round)) return;

  const next = nextMatchPosition(round, slot);
  const data =
    next.position === "A" ? { pairAId: winnerId } : { pairBId: winnerId };

  await prisma.match.update({
    where: {
      tournamentId_round_slot: {
        tournamentId,
        round: next.round,
        slot: next.slot,
      },
    },
    data,
  });
}
