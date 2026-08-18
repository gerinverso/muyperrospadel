import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

const TARGETS = ["SETUP", "PAIRS_DONE", "GROUP_STAGE"] as const;
type Target = (typeof TARGETS)[number];

/**
 * "Deshace" etapas del torneo, borrando lo generado aguas abajo y volviendo el
 * estado a una etapa anterior. Permite corregir sin que nada quede definitivo:
 *   - SETUP: borra cuadro, zonas y parejas -> se pueden editar jugadores.
 *   - PAIRS_DONE: borra cuadro y zonas (mantiene parejas) -> cambiar formato / parejas.
 *   - GROUP_STAGE: borra sólo el cuadro final (mantiene zonas y resultados) -> rehacer cuadro.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const to = body?.to as Target | undefined;
  if (!to || !TARGETS.includes(to)) {
    return NextResponse.json({ error: "Etapa destino inválida" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { groups: { select: { id: true } } },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (to === "GROUP_STAGE" && tournament.groups.length === 0) {
    return NextResponse.json(
      { error: "Este torneo no tiene zonas para volver a la fase de grupos" },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    if (to === "GROUP_STAGE") {
      // Sólo borra el cuadro final; conserva zonas y sus resultados.
      await tx.match.deleteMany({ where: { tournamentId: id, groupId: null } });
      await tx.tournament.update({
        where: { id },
        data: { status: "GROUP_STAGE" },
      });
      return;
    }

    // Para SETUP y PAIRS_DONE hay que borrar todos los partidos y las zonas.
    await tx.match.deleteMany({ where: { tournamentId: id } });
    await tx.group.deleteMany({ where: { tournamentId: id } });

    if (to === "SETUP") {
      await tx.pair.deleteMany({ where: { tournamentId: id } });
      await tx.tournament.update({
        where: { id },
        data: { status: "SETUP" },
      });
    } else {
      // PAIRS_DONE: conserva las parejas, pero las saca de cualquier zona.
      await tx.pair.updateMany({
        where: { tournamentId: id },
        data: { groupId: null },
      });
      await tx.tournament.update({
        where: { id },
        data: { status: "PAIRS_DONE" },
      });
    }
  });

  const updated = await prisma.tournament.findUnique({
    where: { id },
    relationLoadStrategy: "join",
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

  return NextResponse.json(updated);
}
