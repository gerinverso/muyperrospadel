import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";
import { groupSizes } from "@/lib/groups";
import { bracketPlan } from "@/lib/bracket";

const FORMATS = ["SINGLE_ELIMINATION", "GROUPS_KO"] as const;

/**
 * Guarda el formato del torneo y, si es fase de grupos, cuántas zonas hay y
 * cuántos clasifican por zona.
 *
 * Sólo rechaza lo que no se puede jugar (menos de 2 parejas por zona, o más
 * clasificados que parejas en la zona más grande). Todo lo demás se permite y
 * se devuelve como aviso: que en una zona chica clasifiquen todas es una
 * decisión válida del organizador, no un error. Antes se bloqueaba y por eso
 * con pocas parejas no se podían usar más de 2 zonas.
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
    include: { pairs: { select: { id: true } } },
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
    return NextResponse.json({ ...updated, warnings: [] });
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
  const warnings: string[] = [];

  if (pairCount > 0) {
    if (groupsCount * 2 > pairCount) {
      return NextResponse.json(
        {
          error: `Con ${pairCount} parejas no se pueden armar ${groupsCount} zonas: cada zona necesita al menos 2 parejas (máximo ${Math.floor(
            pairCount / 2
          )} zonas)`,
        },
        { status: 400 }
      );
    }

    const sizes = groupSizes(pairCount, groupsCount);
    const biggest = sizes[0];
    const smallest = sizes[sizes.length - 1];

    if (qualifiersPerGroup > biggest) {
      return NextResponse.json(
        {
          error: `La zona más grande queda con ${biggest} parejas: no pueden clasificar ${qualifiersPerGroup}`,
        },
        { status: 400 }
      );
    }

    // Cada zona clasifica como máximo las parejas que tiene.
    const qualifierCount = sizes.reduce(
      (total, size) => total + Math.min(qualifiersPerGroup, size),
      0
    );

    if (qualifiersPerGroup >= smallest) {
      warnings.push(
        `En las zonas de ${smallest} parejas van a clasificar todas. Podés bajarle los clasificados a esa zona cuando estén armadas.`
      );
    }
    if (qualifierCount >= pairCount) {
      warnings.push(
        "Con esta configuración clasifican todas las parejas: la fase de grupos no elimina a nadie."
      );
    }
    const plan = bracketPlan(Math.max(qualifierCount, 2));
    if (plan.byes > 0) {
      warnings.push(
        `Clasifican ${qualifierCount} parejas: el cuadro son ${plan.totalMatches} partidos y ${plan.byes} pase(s) libre(s) en la primera ronda, para que después queden ${plan.firstRoundMatches + plan.firstRoundDirect} parejas justas.`
      );
    }
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: { format, groupsCount, qualifiersPerGroup },
  });

  return NextResponse.json({ ...updated, warnings });
}
