/**
 * Clave de identidad de un jugador a partir de su nombre: minusculas y sin
 * espacios de mas, para que "Juan Perez", "juan perez" y "  Juan   Perez "
 * sean la misma persona y no se cargue dos veces.
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
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
