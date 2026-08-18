import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { forwardPath } from "@/lib/bracket";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id, matchId } = await params;

  const body = await req.json().catch(() => null);
  const winnerId = typeof body?.winnerId === "string" ? body.winnerId : "";

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== id) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }
  if (!match.pairAId || !match.pairBId) {
    return NextResponse.json(
      { error: "Todavía no están definidas las dos parejas de este partido" },
      { status: 409 }
    );
  }
  if (winnerId !== match.pairAId && winnerId !== match.pairBId) {
    return NextResponse.json(
      { error: "La pareja ganadora debe ser una de las dos que juegan este partido" },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (match.groupId) {
    // Partido de fase de grupos: solo registra/actualiza el ganador. No hay
    // cuadro al que propagarlo; la clasificación sale de la tabla de posiciones.
    // Solo editable mientras la fase de grupos sigue abierta (antes de armar
    // el cuadro final, que ya "congela" los clasificados).
    if (tournament.status !== "GROUP_STAGE") {
      return NextResponse.json(
        {
          error:
            "La fase de grupos ya está cerrada: no se pueden cambiar sus resultados",
        },
        { status: 409 }
      );
    }
    await prisma.match.update({ where: { id: matchId }, data: { winnerId } });
  } else {
    // Partido de cuadro de eliminación. Si se cambia el ganador de un partido
    // ya jugado, se propaga el nuevo ganador a la ronda siguiente y se limpian
    // en cascada los resultados posteriores que dependían del ganador anterior.
    if (match.winnerId !== winnerId) {
      const maxRoundAgg = await prisma.match.aggregate({
        where: { tournamentId: id, groupId: null },
        _max: { round: true },
      });
      const totalRounds = maxRoundAgg._max.round ?? match.round;

      await prisma.$transaction(async (tx) => {
        await tx.match.update({
          where: { id: matchId },
          data: { winnerId },
        });

        const path = forwardPath(match.round, match.slot, totalRounds);
        // `incoming` es la pareja que debe entrar en el siguiente partido de la
        // cadena. Tras el primer paso pasa a null para ir limpiando los slots
        // que quedaron sin ganador definido aguas abajo.
        let incoming: string | null = winnerId;
        for (const step of path) {
          const nextMatch = await tx.match.findUnique({
            where: {
              tournamentId_round_slot: {
                tournamentId: id,
                round: step.round,
                slot: step.slot,
              },
            },
          });
          const slotData =
            step.position === "A"
              ? { pairAId: incoming }
              : { pairBId: incoming };
          const hadWinner = nextMatch?.winnerId != null;
          await tx.match.update({
            where: {
              tournamentId_round_slot: {
                tournamentId: id,
                round: step.round,
                slot: step.slot,
              },
            },
            data: hadWinner ? { ...slotData, winnerId: null } : slotData,
          });
          // Si este partido no tenía ganador, nada más adelante dependía de él.
          if (!hadWinner) break;
          incoming = null;
        }

        // El estado del torneo depende de si la final ya tiene ganador.
        const finalMatch = await tx.match.findFirst({
          where: { tournamentId: id, groupId: null, round: totalRounds },
        });
        await tx.tournament.update({
          where: { id },
          data: {
            status: finalMatch?.winnerId ? "FINISHED" : "IN_PROGRESS",
          },
        });
      });
    }
  }

  const updated = await prisma.tournament.findUnique({
    where: { id },
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
