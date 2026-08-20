import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { checkMerge } from "@/lib/players";
import { MERGE_CANDIDATE_SELECT, toMergeCandidate } from "@/lib/player-merge";

/**
 * Fusiona dos jugadores en uno: `keepId` sobrevive y absorbe todo lo de
 * `mergeId`, que se borra.
 *
 * Es el camino por el que los jugadores cargados antes de la auto-inscripcion
 * terminan teniendo DNI: el jugador viejo (con todo su historial) se queda con
 * el DNI del registro nuevo que creo su propia inscripcion.
 *
 * El ranking no necesita nada extra: `computeRanking` suma por jugador leyendo
 * las parejas, asi que reasignarlas alcanza para que el historial quede unido.
 */
export async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => null);
  const keepId = typeof body?.keepId === "string" ? body.keepId : "";
  const mergeId = typeof body?.mergeId === "string" ? body.mergeId : "";

  if (!keepId || !mergeId) {
    return NextResponse.json(
      { error: "Elegí los dos jugadores a fusionar" },
      { status: 400 }
    );
  }

  const rows = await prisma.player.findMany({
    where: { id: { in: [keepId, mergeId] } },
    select: MERGE_CANDIDATE_SELECT,
  });

  const keepRow = rows.find((r) => r.id === keepId);
  const mergeRow = rows.find((r) => r.id === mergeId);
  if (!keepRow || !mergeRow) {
    return NextResponse.json(
      { error: "Alguno de los jugadores ya no existe" },
      { status: 404 }
    );
  }

  const check = checkMerge(toMergeCandidate(keepRow), toMergeCandidate(mergeRow));
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // 1. Las inscripciones del absorbido pasan al que queda. `connect` sobre
    //    una relacion que ya existe no hace nada, asi que los torneos que
    //    compartian no molestan.
    await tx.player.update({
      where: { id: keepId },
      data: {
        tournaments: {
          connect: mergeRow.tournaments.map((t) => ({ id: t.id })),
        },
      },
    });

    // 2. Las parejas historicas apuntan al jugador que queda. Va antes del
    //    borrado: son claves foraneas.
    await tx.pair.updateMany({
      where: { player1Id: mergeId },
      data: { player1Id: keepId },
    });
    await tx.pair.updateMany({
      where: { player2Id: mergeId },
      data: { player2Id: keepId },
    });

    // 3. Se borra el absorbido ANTES de mover el DNI: mientras exista, el
    //    unique de `dni` no dejaria asignarselo al que queda.
    await tx.player.delete({ where: { id: mergeId } });

    if (check.dni !== keepRow.dni) {
      await tx.player.update({
        where: { id: keepId },
        data: { dni: check.dni },
      });
    }
  });

  const merged = await prisma.player.findUnique({
    where: { id: keepId },
    include: { _count: { select: { tournaments: true } } },
  });

  return NextResponse.json(merged);
}
