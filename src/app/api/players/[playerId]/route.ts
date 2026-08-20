import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { normalizeDni, normalizeName } from "@/lib/players";

/** Editar nombre y/o DNI de un jugador del listado maestro. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { playerId } = await params;

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    return NextResponse.json(
      { error: "Jugador no encontrado" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => null);
  const data: { name?: string; nameKey?: string; dni?: string | null } = {};

  // El DNI va primero porque decide si se puede aceptar un nombre repetido.
  if (body?.dni !== undefined) {
    const dni = normalizeDni(typeof body.dni === "string" ? body.dni : null);
    if (dni) {
      const other = await prisma.player.findUnique({ where: { dni } });
      if (other && other.id !== playerId) {
        return NextResponse.json(
          { error: `Ese DNI ya está cargado para "${other.name}"` },
          { status: 409 }
        );
      }
    }
    data.dni = dni;
  }

  const finalDni = "dni" in data ? data.dni : player.dni;

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "El nombre no puede quedar vacío" },
        { status: 400 }
      );
    }
    // El nombre repetido ya no es un error en si mismo: dos personas pueden
    // llamarse igual y se diferencian por el DNI. Sin DNI no habria forma de
    // distinguirlas, asi que ahi si se frena.
    const nameKey = normalizeName(name);
    const other = await prisma.player.findFirst({
      where: { nameKey, id: { not: playerId } },
    });
    if (other && !finalDni) {
      return NextResponse.json(
        {
          error: `Ya existe un jugador llamado "${other.name}". Si es otra persona, cargale el DNI para diferenciarlos.`,
        },
        { status: 409 }
      );
    }
    data.name = name;
    data.nameKey = nameKey;
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data,
    include: { _count: { select: { tournaments: true } } },
  });

  return NextResponse.json(updated);
}

/**
 * Borra un jugador del listado maestro. Sólo se permite si nunca jugó: si
 * tiene historial, borrarlo dejaría torneos y ranking inconsistentes.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { playerId } = await params;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      _count: {
        select: { tournaments: true, pairsAsPlayer1: true, pairsAsPlayer2: true },
      },
    },
  });
  if (!player) {
    return NextResponse.json(
      { error: "Jugador no encontrado" },
      { status: 404 }
    );
  }

  const played =
    player._count.tournaments +
    player._count.pairsAsPlayer1 +
    player._count.pairsAsPlayer2;

  if (played > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede borrar un jugador que ya participó en torneos. Sacalo del torneo si te equivocaste al anotarlo.",
      },
      { status: 409 }
    );
  }

  await prisma.player.delete({ where: { id: playerId } });
  return NextResponse.json({ ok: true });
}
