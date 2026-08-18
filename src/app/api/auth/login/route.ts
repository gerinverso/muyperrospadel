import { NextRequest, NextResponse } from "next/server";
import { getSession, verifyAdminCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Usuario y contraseña son requeridos" },
      { status: 400 }
    );
  }

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.adminName = username.trim();
  await session.save();

  return NextResponse.json({ adminName: session.adminName });
}
