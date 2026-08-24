/**
 * Iconos en SVG, servidos desde nuestro propio bundle.
 *
 * Antes venían de la hoja de estilos de Material Symbols en fonts.googleapis.com,
 * cargada con un <link> en el <head>. Ese link bloquea el primer pintado: si el
 * host no contesta (bloqueador del navegador, DNS privado, servicios de Google
 * restringidos en el equipo) la pantalla queda en blanco con el contenido ya
 * cargado en el DOM. Medido: readyState "loading" y cero entradas de paint.
 *
 * El icono hereda el color con `currentColor` y mide 1em, así que el tamaño se
 * sigue controlando con las clases de texto del lugar donde se usa.
 */

export type IconName =
  | "calendar_month"
  | "event"
  | "group"
  | "groups"
  | "lock"
  | "trophy"
  | "check_circle"
  | "menu"
  | "close";

const PATHS: Record<IconName, React.ReactNode> = {
  calendar_month: (
    <>
      <path d="M7 2v2h10V2h2v2h.5A2.5 2.5 0 0 1 22 6.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H5V2h2Zm13 8H4v9.5c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V10Z" />
      <path d="M7 12h3v3H7v-3Zm7 0h3v3h-3v-3Zm-7 5h3v3H7v-3Zm7 0h3v3h-3v-3Z" />
    </>
  ),
  event: (
    <>
      <path d="M7 2v2h10V2h2v2h.5A2.5 2.5 0 0 1 22 6.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H5V2h2Zm13 8H4v9.5c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V10Z" />
      <path d="M15 13h3v3h-3v-3Z" />
    </>
  ),
  group: (
    <>
      <path d="M9 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M1 19c0-3.31 4.03-5 8-5s8 1.69 8 5v1H1v-1Zm2.2-1h11.6C14.3 16.8 11.8 16 9 16s-5.3.8-5.8 2Z" />
      <path d="M16.5 12a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M17 13c2.83 0 6 1.5 6 4.5V20h-4v-2h2c-.2-1.6-2.3-2.7-4.4-2.9l-.9-1.9c.4-.13.83-.2 1.3-.2Z" />
    </>
  ),
  groups: (
    <>
      <path d="M12 11a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M5.5 12a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm13 0a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
      <path d="M12 12.5c3.04 0 5.5 1.57 5.5 3.9V19h-11v-2.6c0-2.33 2.46-3.9 5.5-3.9Zm-5.5.9c-2.5.13-4.5 1.4-4.5 3.1V19h3v-2.6c0-1.2.56-2.26 1.5-3ZM17.5 13.4c.94.74 1.5 1.8 1.5 3V19h3v-2.5c0-1.7-2-2.97-4.5-3.1Z" />
    </>
  ),
  lock: (
    <>
      <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm3 8H9V6a3 3 0 1 1 6 0v3ZM6 11h12v9H6v-9Z" />
      <path d="M12 13a2 2 0 0 1 1 3.73V18h-2v-1.27A2 2 0 0 1 12 13Z" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 2h10v1h4v4a4 4 0 0 1-4 4h-.35A6 6 0 0 1 13 14.65V18h4v2H7v-2h4v-3.35A6 6 0 0 1 7.35 11H7a4 4 0 0 1-4-4V3h4V2Zm2 2v5a3 3 0 1 0 6 0V4H9ZM7 5H5v2a2 2 0 0 0 2 2V5Zm10 4a2 2 0 0 0 2-2V5h-2v4Z" />
    </>
  ),
  check_circle: (
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1.3 11.9-3.4-3.4 1.4-1.42 2 2 4.6-4.6 1.4 1.42-6 6Z" />
  ),
  menu: <path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />,
  close: (
    <path d="m12 10.59 5.3-5.3 1.41 1.42-5.3 5.29 5.3 5.3-1.42 1.41-5.29-5.3-5.3 5.3-1.41-1.42 5.3-5.29-5.3-5.3L6.71 5.3l5.29 5.3Z" />
  ),
};

export default function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}
