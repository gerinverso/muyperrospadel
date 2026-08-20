import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { buildPairs, validatePairDrafts, type PairDraft } from "@/lib/pairing";
import { loadTournamentDetail } from "@/lib/tournament-query";

/**
 * Define las parejas del torneo. Reemplaza al viejo /draw-pairs porque los tres
 * casos son el mismo: guardar la lista final de parejas.
 *
 *   { pairs: [], drawRest: true }                -> sortea todas
 *   { pairs: [[a, b]], drawRest: true }          -> fija esa y sortea el resto
 *   { pairs: [[a, b], [c, d]], drawRest: false } -> las forma el organizador
 *
 * Los jugadores que quedan afuera (porque son impares o porque el organizador
 * no los emparejó) no son un error: se devuelven en `unpaired` y el torneo se
 * juega con las parejas que se armaron.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { players: { select: { id: true } } },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  // Se pueden definir en SETUP (primera vez) o rehacer en PAIRS_DONE. Una vez
  // armadas las zonas o el cuadro hay que volver atrás con /reset.
  if (tournament.status !== "SETUP" && tournament.status !== "PAIRS_DONE") {
    return NextResponse.json(
      {
        error:
          "Ya se armaron zonas o cuadro. Volvé a la etapa de parejas para cambiarlas.",
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawPairs = body?.pairs ?? [];
  if (!Array.isArray(rawPairs)) {
    return NextResponse.json(
      { error: "Formato de parejas inválido" },
      { status: 400 }
    );
  }

  // Se aceptan las dos formas: [[a, b]] y [{ player1Id, player2Id }].
  const fixed: PairDraft[] = [];
  for (const entry of rawPairs) {
    if (Array.isArray(entry)) {
      fixed.push([entry[0], entry[1]]);
    } else if (entry && typeof entry === "object") {
      fixed.push([entry.player1Id, entry.player2Id]);
    } else {
      return NextResponse.json(
        { error: "Cada pareja necesita dos jugadores" },
        { status: 400 }
      );
    }
  }

  const playerIds = tournament.players.map((p) => p.id);
  const invalid = validatePairDrafts(playerIds, fixed);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const drawRest = body?.drawRest === true;
  const { pairs, unpaired } = buildPairs(playerIds, fixed, drawRest);

  if (pairs.length < 2) {
    return NextResponse.json(
      { error: "Se necesitan al menos 2 parejas para jugar un torneo" },
      { status: 400 }
    );
  }

  const pairingMode = body?.mode === "MANUAL" ? "MANUAL" : "DRAW";

  await prisma.$transaction([
    prisma.pair.deleteMany({ where: { tournamentId: id } }),
    ...pairs.map(([player1Id, player2Id]) =>
      prisma.pair.create({ data: { tournamentId: id, player1Id, player2Id } })
    ),
    prisma.tournament.update({
      where: { id },
      // Definir las parejas cierra las inscripciones: ya nadie puede sumarse,
      // así que dejar el flag prendido solo haría que el panel diga que están
      // abiertas cuando no lo están.
      data: { status: "PAIRS_DONE", registrationOpen: false, pairingMode },
    }),
  ]);

  const updated = await loadTournamentDetail(id);
  return NextResponse.json({ ...updated, unpaired });
}
