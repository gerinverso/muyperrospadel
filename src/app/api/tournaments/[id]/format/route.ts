import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

const FORMATS = ["SINGLE_ELIMINATION", "GROUPS_KO"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { pairs: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (tournament.status !== "SETUP" && tournament.status !== "PAIRS_DONE") {
    return NextResponse.json(
      { error: "El formato ya no se puede cambiar en esta etapa del torneo" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const format = body?.format;
  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  if (format === "SINGLE_ELIMINATION") {
    const updated = await prisma.tournament.update({
      where: { id },
      data: { format, groupsCount: null, qualifiersPerGroup: null },
    });
    return NextResponse.json(updated);
  }

  const groupsCount = Number(body?.groupsCount);
  const qualifiersPerGroup = Number(body?.qualifiersPerGroup);

  if (!Number.isInteger(groupsCount) || groupsCount < 1) {
    return NextResponse.json(
      { error: "La cantidad de zonas debe ser un número entero mayor a 0" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(qualifiersPerGroup) || qualifiersPerGroup < 1) {
    return NextResponse.json(
      { error: "La cantidad de clasificados por zona debe ser al menos 1" },
      { status: 400 }
    );
  }

  const pairCount = tournament.pairs.length;
  if (pairCount > 0) {
    if (groupsCount > pairCount) {
      return NextResponse.json(
        { error: "No puede haber más zonas que parejas" },
        { status: 400 }
      );
    }
    const smallestGroupSize = Math.floor(pairCount / groupsCount);
    if (qualifiersPerGroup >= smallestGroupSize) {
      return NextResponse.json(
        {
          error: `Con ${pairCount} parejas en ${groupsCount} zonas, alguna zona queda con ${smallestGroupSize} parejas: no pueden clasificar ${qualifiersPerGroup}`,
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: { format, groupsCount, qualifiersPerGroup },
  });

  return NextResponse.json(updated);
}
