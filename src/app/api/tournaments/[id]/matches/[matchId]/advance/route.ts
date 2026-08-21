import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { forwardPath } from "@/lib/bracket";
import { loadTournamentDetail } from "@/lib/tournament-query";

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
    return NextResponse.json(await loadTournamentDetail(id));
  }

  if (match.winnerId !== winnerId) {
    await propagate(id, match.round, match.slot, matchId, winnerId);
  }

  return NextResponse.json(await loadTournamentDetail(id));
}

/**
 * Guarda el ganador de un cruce del cuadro y lo lleva a la ronda siguiente.
 *
 * Si se cambia el ganador de un partido ya jugado, limpia en cascada los
 * resultados posteriores que dependían del anterior. Los pases libres no entran
 * acá: son cajas de la primera ronda y ya vienen resueltas desde que se armó el
 * cuadro.
 */
async function propagate(
  tournamentId: string,
  round: number,
  slot: number,
  matchId: string,
  winnerId: string
) {
  // Hasta dónde llega la cadena: la final es la última ronda del cuadro
  // guardado, que es la fuente de verdad.
  const last = await prisma.match.aggregate({
    where: { tournamentId, groupId: null },
    _max: { round: true },
  });
  const totalRounds = last._max.round ?? 0;

  await prisma.$transaction(async (tx) => {
    await tx.match.update({ where: { id: matchId }, data: { winnerId } });

    // `incoming` es la pareja que debe entrar en el cruce siguiente de la
    // cadena. Después del primer paso pasa a null para ir limpiando los cruces
    // que quedaron sin ganador definido aguas abajo.
    let incoming: string | null = winnerId;

    for (const step of forwardPath(round, slot, totalRounds)) {
      const where = {
        tournamentId_round_slot: {
          tournamentId,
          round: step.round,
          slot: step.slot,
        },
      };
      const nextMatch = await tx.match.findUnique({ where });
      const hadWinner = nextMatch?.winnerId != null;
      const slotData =
        step.position === "A" ? { pairAId: incoming } : { pairBId: incoming };

      await tx.match.update({
        where,
        data: hadWinner ? { ...slotData, winnerId: null } : slotData,
      });

      // Si este cruce no tenía ganador, nada más adelante dependía de él.
      if (!hadWinner) break;
      incoming = null;
    }

    const finalMatch = await tx.match.findFirst({
      where: { tournamentId, groupId: null, round: totalRounds },
    });
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: finalMatch?.winnerId ? "FINISHED" : "IN_PROGRESS" },
    });
  });
}
