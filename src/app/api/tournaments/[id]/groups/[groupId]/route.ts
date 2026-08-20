import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { loadTournamentDetail } from "@/lib/tournament-query";

/**
 * Ajustes de una zona ya armada:
 *
 *   { qualifiers: 1 }                     -> de esta zona pasa 1 (y no el general)
 *   { qualifiers: null }                  -> vuelve a usar el número general
 *   { tiebreakOrder: ["pairA", "pairB"] } -> desempate manual del organizador
 *
 * Sólo se puede tocar mientras la fase de grupos está abierta: cuando se arma
 * el cuadro final los clasificados quedan congelados.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id, groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      tournament: { select: { status: true } },
      pairs: { select: { id: true } },
    },
  });
  if (!group || group.tournamentId !== id) {
    return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
  }
  if (group.tournament.status !== "GROUP_STAGE") {
    return NextResponse.json(
      {
        error:
          "La fase de grupos está cerrada: para cambiar los clasificados hay que rehacer el cuadro",
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const data: { qualifiers?: number | null; tiebreakOrder?: string[] } = {};

  if ("qualifiers" in body) {
    const raw = body.qualifiers;
    if (raw === null) {
      data.qualifiers = null;
    } else {
      const qualifiers = Number(raw);
      if (!Number.isInteger(qualifiers) || qualifiers < 1) {
        return NextResponse.json(
          { error: "Los clasificados de la zona tienen que ser al menos 1" },
          { status: 400 }
        );
      }
      if (qualifiers > group.pairs.length) {
        return NextResponse.json(
          {
            error: `La zona tiene ${group.pairs.length} parejas: no pueden clasificar ${qualifiers}`,
          },
          { status: 400 }
        );
      }
      data.qualifiers = qualifiers;
    }
  }

  if ("tiebreakOrder" in body) {
    const order = body.tiebreakOrder;
    if (!Array.isArray(order) || order.some((p) => typeof p !== "string")) {
      return NextResponse.json(
        { error: "Orden de desempate inválido" },
        { status: 400 }
      );
    }
    const ownPairIds = new Set(group.pairs.map((p) => p.id));
    if (
      new Set(order).size !== order.length ||
      order.some((pairId: string) => !ownPairIds.has(pairId))
    ) {
      return NextResponse.json(
        { error: "El orden de desempate tiene que ser de las parejas de esta zona" },
        { status: 400 }
      );
    }
    data.tiebreakOrder = order;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No hay nada para cambiar en la zona" },
      { status: 400 }
    );
  }

  await prisma.group.update({ where: { id: groupId }, data });

  return NextResponse.json(await loadTournamentDetail(id));
}
