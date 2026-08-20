/**
 * Mezcla un arreglo con Fisher-Yates y devuelve una copia (no toca el original).
 *
 * Vive en su propio módulo porque lo usan tres cosas sin relación entre sí
 * (sorteo de parejas, reparto de zonas y sorteo del cuadro): antes estaba en
 * `bracket.ts` y las zonas terminaban importando del cuadro sin motivo.
 */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
