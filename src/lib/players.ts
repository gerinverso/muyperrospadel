/**
 * Clave de identidad de un jugador a partir de su nombre: minusculas, sin
 * acentos y sin espacios de mas, para que "Juan Perez", "juan perez ",
 * "  Juan   Perez " y "Juan Pérez" caigan todas en la misma clave.
 *
 * OJO: esta clave NO identifica a la persona, solo agrupa nombres iguales.
 * Dos personas distintas pueden llamarse igual; la identidad real es el DNI.
 * Se usa para detectar posibles duplicados y para reutilizar un jugador ya
 * cargado cuando el administrador escribe un nombre a mano.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "") // saca los diacriticos que dejo NFD
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Normaliza un DNI dejando solo digitos, para aceptar tanto "12.345.678"
 * como "12345678". Devuelve null si no queda nada.
 */
export function normalizeDni(dni: string | null | undefined): string | null {
  if (!dni) return null;
  const digits = dni.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/** Formatea un DNI para mostrar: 12345678 -> 12.345.678 */
export function formatDni(dni: string | null | undefined): string | null {
  if (!dni) return null;
  return dni.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Un DNI argentino valido tiene entre 7 y 9 digitos. */
export function isValidDni(dni: string): boolean {
  return /^\d{7,9}$/.test(dni);
}

// --- Auto-inscripcion -----------------------------------------------------

export type RegistrationAction =
  /** El DNI ya existe y el jugador ya estaba anotado: no hay nada que hacer. */
  | { kind: "already-registered"; playerId: string }
  /** El DNI ya existe: se anota ese jugador, sin tocarle el nombre. */
  | { kind: "reuse"; playerId: string }
  /** DNI nuevo: se crea un jugador, aunque el nombre ya exista. */
  | { kind: "create" };

/**
 * Decide que hacer con una inscripcion publica. La regla es deliberadamente
 * corta: la unica coincidencia que vale es el DNI exacto.
 *
 * Un nombre repetido NO alcanza para reutilizar un jugador existente: puede ser
 * un homonimo, y quedarse con el registro ajeno le robaria el historial y el
 * ranking a otra persona. Ante la duda se crea uno nuevo y el administrador
 * decide despues si hay que fusionarlos.
 */
export function resolveRegistration(
  playerWithSameDni: { id: string } | null,
  isAlreadyInTournament: boolean
): RegistrationAction {
  if (!playerWithSameDni) return { kind: "create" };
  if (isAlreadyInTournament) {
    return { kind: "already-registered", playerId: playerWithSameDni.id };
  }
  return { kind: "reuse", playerId: playerWithSameDni.id };
}

// --- Fusion de duplicados -------------------------------------------------

export type MergeCandidate = {
  id: string;
  name: string;
  dni: string | null;
  /** Torneos a los que esta anotado. */
  tournaments: { id: string; name: string }[];
  /** Torneos en los que ademas tiene pareja armada. */
  pairedTournaments: { id: string; name: string }[];
};

export type MergeCheck =
  | { ok: true; dni: string | null }
  | {
      ok: false;
      reason: "same-player" | "both-have-dni" | "shared-pair-tournament";
      message: string;
    };

/**
 * Valida si dos jugadores pueden fusionarse en uno solo, y con que DNI queda
 * el que sobrevive.
 *
 * Las dos guardas cubren el mismo riesgo desde angulos distintos: fusionar a
 * dos personas que solo comparten el nombre. Es una operacion destructiva y no
 * hay como deshacerla, asi que ante la duda no se fusiona.
 *
 * Compartir un torneo NO alcanza para bloquear: el caso normal es que el
 * administrador haya anotado a mano al jugador viejo y que despues la misma
 * persona se anote sola al mismo torneo. Lo que si bloquea es que los dos
 * tengan PAREJA en el mismo torneo: ahi jugaron por separado, o sea que son dos
 * personas, y ademas la fusion violaria el unique (torneo, jugador) de Pair.
 */
export function checkMerge(keep: MergeCandidate, merge: MergeCandidate): MergeCheck {
  if (keep.id === merge.id) {
    return {
      ok: false,
      reason: "same-player",
      message: "No se puede fusionar un jugador consigo mismo",
    };
  }

  if (keep.dni && merge.dni && keep.dni !== merge.dni) {
    return {
      ok: false,
      reason: "both-have-dni",
      message: `"${keep.name}" y "${merge.name}" tienen DNI distinto, así que son dos personas`,
    };
  }

  const keepPaired = new Set(keep.pairedTournaments.map((t) => t.id));
  const shared = merge.pairedTournaments.find((t) => keepPaired.has(t.id));
  if (shared) {
    return {
      ok: false,
      reason: "shared-pair-tournament",
      message: `Los dos jugaron "${shared.name}" en parejas distintas, así que son dos personas`,
    };
  }

  return { ok: true, dni: keep.dni ?? merge.dni };
}
