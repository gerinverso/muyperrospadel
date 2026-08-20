import { shuffle } from "@/lib/shuffle";

/** Una pareja todavía sin guardar: los dos ids de jugador. */
export type PairDraft = [string, string];

export type BuildPairsResult = {
  pairs: PairDraft[];
  /**
   * Jugadores que quedaron sin pareja. Pasa cuando el organizador todavía no
   * los emparejó o cuando la cantidad de anotados es impar: no es un error, el
   * torneo se juega con las parejas que se pudieron armar.
   */
  unpaired: string[];
};

/**
 * Valida una lista de parejas contra los jugadores del torneo y devuelve el
 * mensaje de error (ya listo para mostrar) o null si está todo bien.
 *
 * Está separada de `buildPairs` para que la API pueda responder 400 con el
 * texto exacto sin tener que distinguir un error de datos de un bug.
 */
export function validatePairDrafts(
  playerIds: string[],
  pairs: PairDraft[]
): string | null {
  const valid = new Set(playerIds);
  const used = new Set<string>();

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      return "Cada pareja necesita dos jugadores";
    }
    const [a, b] = pair;
    if (typeof a !== "string" || typeof b !== "string" || !a || !b) {
      return "Cada pareja necesita dos jugadores";
    }
    if (a === b) {
      return "Una pareja no puede tener el mismo jugador dos veces";
    }
    for (const playerId of pair) {
      if (!valid.has(playerId)) {
        return "Hay un jugador que no pertenece a este torneo";
      }
      if (used.has(playerId)) {
        return "Un jugador no puede estar en más de una pareja";
      }
      used.add(playerId);
    }
  }

  return null;
}

/**
 * Arma la lista final de parejas del torneo.
 *
 * `fixedPairs` son las que el organizador definió a mano y se respetan tal
 * cual. Si `drawRest` es true, los jugadores que quedaron libres se sortean
 * entre sí y se agregan al final; si es false quedan en `unpaired`.
 *
 * Con una cantidad impar de jugadores libres siempre sobra uno, que queda en
 * `unpaired`. Es a propósito: el organizador ve el aviso y decide si lo saca,
 * suma a alguien o juega sin él.
 */
export function buildPairs(
  playerIds: string[],
  fixedPairs: PairDraft[],
  drawRest: boolean
): BuildPairsResult {
  const error = validatePairDrafts(playerIds, fixedPairs);
  if (error) throw new Error(error);

  const taken = new Set(fixedPairs.flat());
  const free = playerIds.filter((id) => !taken.has(id));

  if (!drawRest) {
    return { pairs: [...fixedPairs], unpaired: free };
  }

  const shuffled = shuffle(free);
  const pairs: PairDraft[] = [...fixedPairs];
  let i = 0;
  for (; i + 1 < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }

  return { pairs, unpaired: shuffled.slice(i) };
}
