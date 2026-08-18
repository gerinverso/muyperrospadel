import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: { orderBy: { createdAt: "asc" } },
      pairs: {
        orderBy: { createdAt: "asc" },
        include: { player1: true, player2: true },
      },
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

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  return NextResponse.json(tournament);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
