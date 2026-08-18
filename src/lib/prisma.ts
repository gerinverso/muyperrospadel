import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Construye la config del adapter pg.
 *
 * - SSL: node-postgres interpreta `sslmode=require` como `verify-full` y rechaza
 *   la cadena de certificados del pooler de Supabase (SELF_SIGNED_CERT_IN_CHAIN).
 *   Para hosts remotos usamos SSL sin verificación estricta de CA; en localhost, sin SSL.
 * - Pool chico: el pooler de Supabase (session mode) limita el total de clientes
 *   (pool_size ~15). Un pool grande lo satura y tira `EMAXCONNSESSION`. Mantenemos
 *   pocas conexiones y cerramos las ociosas rápido.
 *
 * El CLI de Prisma sigue leyendo DATABASE_URL (con sslmode) por su cuenta para migraciones.
 */
function buildAdapter() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  const pool = {
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  };
  try {
    const url = new URL(rawUrl);
    const isLocal =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    url.searchParams.delete("sslmode");
    const connectionString = url.toString();
    return new PrismaPg(
      isLocal
        ? { connectionString, ...pool }
        : { connectionString, ssl: { rejectUnauthorized: false }, ...pool }
    );
  } catch {
    return new PrismaPg({ connectionString: rawUrl, ...pool });
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: buildAdapter() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
