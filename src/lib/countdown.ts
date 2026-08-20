/**
 * Argentina esta en UTC-3 todo el año (no usa horario de verano). Igual que en
 * `ranking.ts`, la cuenta se hace siempre con este huso y no con el del
 * servidor: Vercel corre en UTC, asi que un torneo que arranca el sabado a las
 * 9 de la mañana no tiene que decir "faltan 2 días" en local y "faltan 1 día"
 * en produccion.
 */
const ARGENTINA_UTC_OFFSET_HOURS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Numero de dia calendario argentino, para restar dias sin mirar la hora. */
function argentinaDayNumber(date: Date): number {
  return Math.floor(
    (date.getTime() - ARGENTINA_UTC_OFFSET_HOURS * 60 * 60 * 1000) / MS_PER_DAY
  );
}

/**
 * Dias de calendario que faltan para una fecha. Cuenta dias, no horas: si
 * arranca mañana a las 8 devuelve 1, aunque falten 14 horas.
 */
export function daysUntil(startsAt: Date, now: Date): number {
  return argentinaDayNumber(startsAt) - argentinaDayNumber(now);
}

/**
 * Texto de la cuenta regresiva. Devuelve null cuando no hay nada que contar:
 * sin fecha cargada, o con la fecha ya pasada (el torneo puede seguir con las
 * inscripciones abiertas, y ahi el anuncio se muestra igual pero sin contador).
 */
export function countdownLabel(
  startsAt: Date | null | undefined,
  now: Date
): string | null {
  if (!startsAt) return null;

  const days = daysUntil(startsAt, now);
  if (days < 0) return null;
  if (days === 0) return "¡Es hoy!";
  if (days === 1) return "Falta 1 día";
  return `Faltan ${days} días`;
}
