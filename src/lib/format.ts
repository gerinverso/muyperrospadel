/**
 * Formatos que comparten la home, el anuncio del proximo torneo y la tabla de
 * torneos. Todas las fechas se muestran en hora argentina y no en la del
 * servidor: Vercel corre en UTC y un torneo que arranca 20:00 del sabado no
 * tiene que aparecer como domingo.
 */
const TIME_ZONE = "America/Argentina/Buenos_Aires";

/** "$18.000". El monto es lo que pone cada jugador, no la pareja. */
export function formatFee(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

/** "sábado 12 de abril" */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(date);
}

/** "12 ABR", para las celdas de las tablas. */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}
