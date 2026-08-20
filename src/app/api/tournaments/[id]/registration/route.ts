import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

/**
 * Fecha de inicio del torneo e interruptor de inscripciones. Los dos campos
 * controlan el anuncio de la home: se anuncia el torneo con inscripciones
 * abiertas mas proximo, y la fecha es la que da la cuenta regresiva.
 *
 * Cerrar las inscripciones NO cambia el estado del torneo: sigue en SETUP y el
 * sorteo se hace igual que siempre. Solo apaga el anuncio y el endpoint publico.
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
    select: { status: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  const data: { startsAt?: Date | null; registrationOpen?: boolean } = {};

  if ("startsAt" in (body ?? {})) {
    const raw = body.startsAt;
    if (raw === null || raw === "") {
      data.startsAt = null;
    } else {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "La fecha de inicio no es válida" },
          { status: 400 }
        );
      }
      data.startsAt = parsed;
    }
  }

  if ("registrationOpen" in (body ?? {})) {
    if (typeof body.registrationOpen !== "boolean") {
      return NextResponse.json(
        { error: "El estado de las inscripciones no es válido" },
        { status: 400 }
      );
    }
    // Abrir inscripciones despues del sorteo no tendria sentido: los jugadores
    // que se anotaran quedarian afuera del cuadro.
    if (body.registrationOpen && tournament.status !== "SETUP") {
      return NextResponse.json(
        {
          error:
            "Ya se sortearon las parejas, no se pueden reabrir las inscripciones",
        },
        { status: 409 }
      );
    }
    data.registrationOpen = body.registrationOpen;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay nada que cambiar" }, { status: 400 });
  }

  const updated = await prisma.tournament.update({ where: { id }, data });
  return NextResponse.json(updated);
}
