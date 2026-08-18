import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Construye la config del adapter pg. node-postgres interpreta `sslmode=require`
 * como `verify-full` y rechaza la cadena de certificados del pooler de Supabase
 * (SELF_SIGNED_CERT_IN_CHAIN). Para hosts remotos usamos SSL sin verificación
 * estricta de CA; para localhost, sin SSL. El CLI de Prisma sigue leyendo
 * DATABASE_URL (con sslmode) por su cuenta para las migraciones.
 */
function buildAdapter() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(rawUrl);
    const isLocal =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    url.searchParams.delete("sslmode");
    const connectionString = url.toString();
    return new PrismaPg(
      isLocal
        ? { connectionString }
        : { connectionString, ssl: { rejectUnauthorized: false } }
    );
  } catch {
    return new PrismaPg({ connectionString: rawUrl });
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: buildAdapter() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
