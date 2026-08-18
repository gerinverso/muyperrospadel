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

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (tournament.status !== "SETUP") {
    return NextResponse.json(
      { error: "Ya se sortearon las parejas, no se pueden agregar jugadores" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const names: string[] = Array.isArray(body?.names)
    ? body.names
        .map((n: unknown) => (typeof n === "string" ? n.trim() : ""))
        .filter(Boolean)
    : [];

  if (names.length === 0) {
    return NextResponse.json(
      { error: "Ingresá al menos un nombre" },
      { status: 400 }
    );
  }

  await prisma.player.createMany({
    data: names.map((name) => ({ name, tournamentId: id })),
  });

  const players = await prisma.player.findMany({
    where: { tournamentId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(players, { status: 201 });
}
