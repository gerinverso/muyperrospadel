import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { players: true } } },
  });
  return NextResponse.json(tournaments);
}

export async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "El nombre del torneo es requerido" },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.create({ data: { name } });
  return NextResponse.json(tournament, { status: 201 });
}
