import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { normalizeDni, normalizeName } from "@/lib/players";

/** Listado maestro de jugadores del club. */
export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tournaments: true } } },
  });
  return NextResponse.json(players);
}

/** Alta de un jugador nuevo en el listado maestro. */
export async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const dni = normalizeDni(typeof body?.dni === "string" ? body.dni : null);

  if (!name) {
    return NextResponse.json(
      { error: "El nombre del jugador es requerido" },
      { status: 400 }
    );
  }

  const nameKey = normalizeName(name);

  if (dni) {
    const withDni = await prisma.player.findUnique({ where: { dni } });
    if (withDni) {
      return NextResponse.json(
        { error: `Ese DNI ya está cargado para "${withDni.name}"` },
        { status: 409 }
      );
    }
  }

  // El nombre repetido ya no es un error en si mismo: dos personas distintas
  // pueden llamarse igual y se diferencian por el DNI. Pero sin DNI no habria
  // forma de distinguirlas despues, asi que ahi si se frena.
  const existing = await prisma.player.findFirst({ where: { nameKey } });
  if (existing && !dni) {
    return NextResponse.json(
      {
        error: `Ya existe un jugador llamado "${existing.name}". Si es otra persona, cargale el DNI para diferenciarlos.`,
      },
      { status: 409 }
    );
  }

  const player = await prisma.player.create({
    data: { name, nameKey, dni },
    include: { _count: { select: { tournaments: true } } },
  });

  return NextResponse.json(player, { status: 201 });
}
