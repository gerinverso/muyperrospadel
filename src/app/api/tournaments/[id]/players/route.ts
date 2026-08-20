import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { normalizeName } from "@/lib/players";

/**
 * Anota jugadores a un torneo. Acepta dos formas, combinables:
 *   - `playerIds`: jugadores que ya existen en el listado maestro.
 *   - `names`: nombres escritos a mano; si el jugador ya existe se reutiliza
 *     (comparando el nombre normalizado) y si no, se crea en el listado.
 */
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

  const playerIds: string[] = Array.isArray(body?.playerIds)
    ? body.playerIds.filter((v: unknown): v is string => typeof v === "string")
    : [];

  if (names.length === 0 && playerIds.length === 0) {
    return NextResponse.json(
      { error: "Elegí jugadores del listado o ingresá al menos un nombre" },
      { status: 400 }
    );
  }

  const idsToConnect = new Set<string>();

  if (playerIds.length > 0) {
    const found = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true },
    });
    if (found.length !== new Set(playerIds).size) {
      return NextResponse.json(
        { error: "Alguno de los jugadores elegidos ya no existe" },
        { status: 400 }
      );
    }
    found.forEach((p) => idsToConnect.add(p.id));
  }

  // Los nombres escritos a mano se resuelven contra el listado maestro para no
  // duplicar personas: mismo nombre normalizado => mismo jugador.
  //
  // Desde que el DNI es la identidad, el nombre normalizado dejo de ser unico:
  // puede haber dos personas distintas que se llamen igual. Cuando pasa, no hay
  // forma de adivinar a cual se referia, asi que se pide elegirlo del listado.
  const seenKeys = new Set<string>();
  for (const name of names) {
    const nameKey = normalizeName(name);
    if (seenKeys.has(nameKey)) continue;
    seenKeys.add(nameKey);

    const matches = await prisma.player.findMany({
      where: { nameKey },
      select: { id: true, name: true, dni: true },
      orderBy: { createdAt: "asc" },
    });

    if (matches.length > 1) {
      return NextResponse.json(
        {
          error: `Hay ${matches.length} jugadores llamados "${name}". Elegí el que va desde el listado en vez de escribirlo.`,
        },
        { status: 409 }
      );
    }

    if (matches.length === 1) {
      idsToConnect.add(matches[0].id);
      continue;
    }

    const player = await prisma.player.create({
      data: { name, nameKey },
      select: { id: true },
    });
    idsToConnect.add(player.id);
  }

  await prisma.tournament.update({
    where: { id },
    data: {
      players: { connect: [...idsToConnect].map((playerId) => ({ id: playerId })) },
    },
  });

  const players = await prisma.player.findMany({
    where: { tournaments: { some: { id } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(players, { status: 201 });
}
