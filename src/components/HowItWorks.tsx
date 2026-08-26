const STEPS = [
  {
    label: "01 · Te anotás",
    text: "Nombre y DNI en el formulario del torneo. Sin cuenta y sin la lista de WhatsApp que nadie lee.",
  },
  {
    label: "02 · Sorteo",
    text: "Las parejas salen al azar delante de todos, o armadas a mano si el torneo lo pide.",
  },
  {
    label: "03 · Zonas y cuadro",
    text: "Fase de grupos para jugar varios partidos, después eliminación directa hasta la final.",
  },
  {
    label: "04 · Puntos",
    text: "Campeón, finalista y semifinalistas suman al ranking de la temporada.",
  },
];

/**
 * Las cuatro etapas de un torneo, en una franja de celdas separadas por lineas
 * de 1px.
 *
 * El separador es el `gap-px` sobre un fondo claro y no un `border` por celda:
 * asi las lineas siguen cayendo donde corresponde cuando la grilla pasa de 4
 * columnas a 2 y a 1, sin bordes colgados al final de cada fila.
 */
export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="grid grid-cols-1 gap-px border-b border-surface-bright bg-surface-bright sm:grid-cols-2 lg:grid-cols-4"
    >
      {STEPS.map((step) => (
        <div
          key={step.label}
          className="flex flex-col gap-3 bg-surface-container-lowest px-margin-mobile py-space-md md:px-space-md"
        >
          <span className="font-label-caps text-label-caps text-primary-fixed">
            {step.label}
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {step.text}
          </p>
        </div>
      ))}
    </section>
  );
}
