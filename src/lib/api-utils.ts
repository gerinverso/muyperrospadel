import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function ensureAdmin() {
  const session = await getSession();
  if (!session.adminName) {
    return null;
  }
  return session.adminName;
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
