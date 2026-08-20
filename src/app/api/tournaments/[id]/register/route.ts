import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isValidDni,
  normalizeDni,
  normalizeName,
  resolveRegistration,
} from "@/lib/players";

/**
 * Inscripcion publica a un torneo. Es el unico endpoint de escritura SIN
 * autenticacion: cualquiera que entre a la web puede anotarse con su DNI y su
 * nombre.
 *
 * Por eso nunca modifica un registro existente. Si el DNI ya esta cargado se
 * reutiliza ese jugador (sin pisarle el nombre) y si no, se crea uno nuevo
 * aunque el nombre se repita. La unificacion de duplicados es una decision del
 * administrador, no de este endpoint.
 */
const bodySchema = z.object({
  dni: z.string(),
  name: z.string().trim().min(2).max(60),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, registrationOpen: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (!tournament.registrationOpen) {
    return NextResponse.json(
      { error: "Las inscripciones de este torneo están cerradas" },
      { status: 409 }
    );
  }
  if (tournament.status !== "SETUP") {
    return NextResponse.json(
      { error: "Ya se sortearon las parejas, no se pueden anotar más jugadores" },
      { status: 409 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ingresá tu nombre y apellido completos" },
      { status: 400 }
    );
  }

  const dni = normalizeDni(parsed.data.dni);
  if (!dni || !isValidDni(dni)) {
    return NextResponse.json(
      { error: "El DNI no es válido: tiene que tener entre 7 y 9 números" },
      { status: 400 }
    );
  }

  const name = parsed.data.name.replace(/\s+/g, " ");

  const existing = await prisma.player.findUnique({
    where: { dni },
    select: {
      id: true,
      name: true,
      // Vacio si todavia no esta anotado a este torneo.
      tournaments: { where: { id }, select: { id: true } },
    },
  });

  const action = resolveRegistration(
    existing ? { id: existing.id } : null,
    (existing?.tournaments.length ?? 0) > 0
  );

  if (action.kind === "already-registered") {
    return NextResponse.json({
      name: existing!.name,
      alreadyRegistered: true,
      tournamentName: tournament.name,
    });
  }

  if (action.kind === "reuse") {
    await prisma.tournament.update({
      where: { id },
      data: { players: { connect: { id: action.playerId } } },
    });
    return NextResponse.json(
      {
        name: existing!.name,
        alreadyRegistered: false,
        tournamentName: tournament.name,
      },
      { status: 201 }
    );
  }

  // DNI nuevo. Dos personas mandando el mismo DNI a la vez harian fallar el
  // unique: si pasa, el segundo se resuelve como si el jugador ya existiera.
  try {
    const player = await prisma.player.create({
      data: {
        name,
        nameKey: normalizeName(name),
        dni,
        tournaments: { connect: { id } },
      },
      select: { name: true },
    });
    return NextResponse.json(
      {
        name: player.name,
        alreadyRegistered: false,
        tournamentName: tournament.name,
      },
      { status: 201 }
    );
  } catch {
    const raced = await prisma.player.findUnique({
      where: { dni },
      select: { id: true, name: true },
    });
    if (!raced) {
      return NextResponse.json(
        { error: "No pudimos completar la inscripción, probá de nuevo" },
        { status: 500 }
      );
    }
    await prisma.tournament.update({
      where: { id },
      data: { players: { connect: { id: raced.id } } },
    });
    return NextResponse.json({
      name: raced.name,
      alreadyRegistered: false,
      tournamentName: tournament.name,
    });
  }
}
