import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { drawPairs } from "@/lib/bracket";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { players: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (tournament.status !== "SETUP") {
    return NextResponse.json(
      { error: "Las parejas ya fueron sorteadas para este torneo" },
      { status: 409 }
    );
  }
  if (tournament.players.length < 4) {
    return NextResponse.json(
      { error: "Se necesitan al menos 4 jugadores para sortear parejas" },
      { status: 400 }
    );
  }
  if (tournament.players.length % 2 !== 0) {
    return NextResponse.json(
      { error: "La cantidad de jugadores debe ser par" },
      { status: 400 }
    );
  }

  const pairs = drawPairs(tournament.players.map((p) => p.id));

  await prisma.$transaction([
    ...pairs.map(([p1, p2]) =>
      prisma.pair.create({
        data: { tournamentId: id, player1Id: p1, player2Id: p2 },
      })
    ),
    prisma.tournament.update({
      where: { id },
      data: { status: "PAIRS_DONE" },
    }),
  ]);

  const updated = await prisma.tournament.findUnique({
    where: { id },
    include: {
      pairs: { include: { player1: true, player2: true } },
    },
  });

  return NextResponse.json(updated);
}
