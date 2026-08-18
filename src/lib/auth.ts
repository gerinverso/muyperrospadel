import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  adminName?: string;
};

const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionPassword || sessionPassword.length < 32) {
  throw new Error(
    "SESSION_PASSWORD debe estar definido en .env con al menos 32 caracteres"
  );
}

export const sessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: "mpp_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.adminName) {
    throw new Error("UNAUTHORIZED");
  }
  return session.adminName;
}

function parseAdminUsers(): Map<string, string> {
  const raw = process.env.ADMIN_USERS ?? "";
  const entries = raw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(":");
      return [pair.slice(0, idx).toLowerCase(), pair.slice(idx + 1)] as [
        string,
        string
      ];
    });
  return new Map(entries);
}

export function verifyAdminCredentials(
  username: string,
  password: string
): boolean {
  const users = parseAdminUsers();
  const expected = users.get(username.trim().toLowerCase());
  return Boolean(expected) && expected === password;
}
