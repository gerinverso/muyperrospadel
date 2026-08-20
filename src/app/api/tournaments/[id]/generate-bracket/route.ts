import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { generateBracket, seedBracket, type BracketSlot } from "@/lib/bracket";
import { computeQualifiers, seedQualifiers } from "@/lib/groups";
import { loadTournamentDetail } from "@/lib/tournament-query";

/**
 * Arma el cuadro de eliminación.
 *
 * Con fase de grupos toma los clasificados de cada zona (respetando el número
 * propio de cada una) y los siembra: los pases libres caen en los mejores y se
 * evita que dos parejas de la misma zona se cruzen de entrada. Sin fase de
 * grupos se sortea el cruce.
 *
 * Los pases libres vienen ya resueltos y ubicados en la ronda siguiente desde
 * `@/lib/bracket`, así que no hay que propagar nada después de guardar.
 */
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
      pairs: { select: { id: true } },
      groups: {
        orderBy: { index: "asc" },
        include: { pairs: { select: { id: true } }, matches: true },
      },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  let slots: BracketSlot[];

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

    const zones = computeQualifiers(
      tournament.groups.map((group) => ({
        id: group.id,
        index: group.index,
        pairIds: group.pairs.map((p) => p.id),
        matches: group.matches.map((m) => ({
          pairAId: m.pairAId,
          pairBId: m.pairBId,
          winnerId: m.winnerId,
        })),
        qualifiers: group.qualifiers,
        tiebreakOrder: group.tiebreakOrder,
      })),
      tournament.qualifiersPerGroup ?? 1
    );

    const seeded = seedQualifiers(zones);
    if (seeded.length < 2) {
      return NextResponse.json(
        { error: "No hay suficientes clasificados para armar el cuadro" },
        { status: 400 }
      );
    }

    const zoneByPair = new Map(seeded.map((s) => [s.pairId, s.groupIndex]));
    slots = seedBracket(
      seeded.map((s) => s.pairId),
      (pairId) => zoneByPair.get(pairId)
    );
  } else {
    if (tournament.status !== "PAIRS_DONE") {
      return NextResponse.json(
        {
          error:
            "El cuadro ya fue generado o todavía no se definieron las parejas",
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
    slots = generateBracket(tournament.pairs.map((p) => p.id));
  }

  // Un cuadro de 2 parejas no puede venir con la final resuelta, pero el estado
  // se calcula igual desde el resultado para no depender de eso.
  const totalRounds = Math.max(...slots.map((s) => s.round));
  const champion = slots.find((s) => s.round === totalRounds)?.winnerId;

  await prisma.$transaction([
    prisma.match.createMany({
      data: slots.map((s) => ({
        tournamentId: id,
        round: s.round,
        slot: s.slot,
        pairAId: s.pairAId,
        pairBId: s.pairBId,
        winnerId: s.winnerId,
      })),
    }),
    prisma.tournament.update({
      where: { id },
      data: { status: champion ? "FINISHED" : "IN_PROGRESS" },
    }),
  ]);

  return NextResponse.json(await loadTournamentDetail(id));
}
