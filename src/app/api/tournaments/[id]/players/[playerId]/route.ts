import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

/**
 * Saca a un jugador del torneo. El jugador sigue existiendo en el listado
 * maestro del club: sólo se borra su inscripción a este torneo.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id, playerId } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (tournament.status !== "SETUP") {
    return NextResponse.json(
      { error: "Ya se sortearon las parejas, no se pueden quitar jugadores" },
      { status: 409 }
    );
  }

  await prisma.tournament.update({
    where: { id },
    data: { players: { disconnect: { id: playerId } } },
  });

  return NextResponse.json({ ok: true });
}
