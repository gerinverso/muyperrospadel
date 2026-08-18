import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin, unauthorized } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const registrationFee = Number(body?.registrationFee);
  const courtCost = Number(body?.courtCost);

  if (!Number.isFinite(registrationFee) || registrationFee < 0) {
    return NextResponse.json(
      { error: "El monto de inscripción no es válido" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(courtCost) || courtCost < 0) {
    return NextResponse.json(
      { error: "El costo de cancha no es válido" },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.update({
    where: { id },
    data: { registrationFee, courtCost },
  });

  return NextResponse.json(tournament);
}
