import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
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
  if (tournament.status !== "PAIRS_DONE") {
    return NextResponse.json(
      {
        error:
          "Las parejas solo se pueden editar después del sorteo y antes de armar zonas o cuadro",
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawPairs = body?.pairs;
  if (!Array.isArray(rawPairs)) {
    return NextResponse.json(
      { error: "Formato de parejas inválido" },
      { status: 400 }
    );
  }

  const pairs: { player1Id: string; player2Id: string }[] = [];
  for (const p of rawPairs) {
    if (typeof p?.player1Id !== "string" || typeof p?.player2Id !== "string") {
      return NextResponse.json(
        { error: "Cada pareja necesita dos jugadores" },
        { status: 400 }
      );
    }
    pairs.push({ player1Id: p.player1Id, player2Id: p.player2Id });
  }

  const validPlayerIds = new Set(tournament.players.map((p) => p.id));
  const usedPlayerIds = new Set<string>();
  for (const { player1Id, player2Id } of pairs) {
    if (player1Id === player2Id) {
      return NextResponse.json(
        { error: "Una pareja no puede tener el mismo jugador dos veces" },
        { status: 400 }
      );
    }
    for (const playerId of [player1Id, player2Id]) {
      if (!validPlayerIds.has(playerId)) {
        return NextResponse.json(
          { error: "Hay un jugador que no pertenece a este torneo" },
          { status: 400 }
        );
      }
      if (usedPlayerIds.has(playerId)) {
        return NextResponse.json(
          { error: "Un jugador no puede estar en más de una pareja" },
          { status: 400 }
        );
      }
      usedPlayerIds.add(playerId);
    }
  }

  if (usedPlayerIds.size !== tournament.players.length) {
    return NextResponse.json(
      { error: "Todos los jugadores deben quedar asignados a una pareja" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.pair.deleteMany({ where: { tournamentId: id } }),
    ...pairs.map(({ player1Id, player2Id }) =>
      prisma.pair.create({
        data: { tournamentId: id, player1Id, player2Id },
      })
    ),
  ]);

  const updated = await prisma.tournament.findUnique({
    where: { id },
    include: {
      pairs: { include: { player1: true, player2: true } },
    },
  });

  return NextResponse.json(updated);
}
