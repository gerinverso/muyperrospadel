import Link from "next/link";
import Icon from "@/components/Icon";
import type { TournamentStatus } from "@/lib/types";

export type TournamentRow = {
  id: string;
  name: string;
  status: TournamentStatus;
  statusLabel: string;
  players: number;
  /** "12 ABR" o "Sin fecha". */
  when: string;
  /** Lo que pone cada jugador, ya formateado, o null si todavía no se definió. */
  fee: string | null;
};

const STATUS_BADGE: Record<TournamentStatus, string> = {
  SETUP: "border-primary-fixed/45 text-primary-fixed",
  PAIRS_DONE: "border-secondary/45 text-secondary",
  GROUP_STAGE: "border-secondary/45 text-secondary",
  IN_PROGRESS: "border-tertiary-fixed/45 text-tertiary-fixed",
  FINISHED: "border-outline-variant text-on-surface-variant",
};

function Badge({ row }: { row: TournamentRow }) {
  return (
    <span
      className={`font-label-caps text-label-caps inline-flex min-h-7 items-center border px-2.5 ${
        STATUS_BADGE[row.status]
      }`}
    >
      {row.statusLabel}
    </span>
  );
}

function feeClasses(row: TournamentRow): string {
  return row.status === "FINISHED" ? "text-outline" : "text-primary-fixed";
}

export default function TournamentsList({
  rows,
  total,
  filters,
  activeStatus,
  month,
  hiddenFields,
}: {
  rows: TournamentRow[];
  total: number;
  filters: { value: TournamentStatus | "ALL"; label: string; href: string }[];
  activeStatus: TournamentStatus | "ALL";
  month?: string;
  /** Filtros vigentes que el formulario de mes tiene que arrastrar al enviar. */
  hiddenFields: { name: string; value: string }[];
}) {
  return (
    <section className="border-b border-surface-bright px-margin-mobile py-space-lg md:px-margin-desktop">
      <div className="mb-space-md flex flex-wrap items-end justify-between gap-space-sm">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile uppercase tracking-tight text-on-surface md:font-headline-lg md:text-headline-lg">
          Torneos
        </h2>
        <span className="font-label-caps text-label-caps tabular-nums text-outline">
          {rows.length} de {total}
        </span>
      </div>

      <div className="mb-space-md flex flex-col items-stretch gap-space-sm lg:flex-row lg:items-center lg:justify-between">
        {/* El control segmentado se desplaza de costado en mobile en vez de
            partirse en dos filas: cortado a la mitad no se lee como un control. */}
        <div className="-mx-margin-mobile overflow-x-auto px-margin-mobile lg:mx-0 lg:px-0">
          <div className="flex w-fit border border-surface-bright">
            {filters.map((f) => (
              <Link
                key={f.value}
                href={f.href}
                className={`font-label-caps text-label-caps flex min-h-11 items-center whitespace-nowrap border-r border-surface-bright px-5 transition-colors last:border-r-0 ${
                  activeStatus === f.value
                    ? "bg-primary-fixed text-on-primary-fixed"
                    : "text-on-surface-variant hover:text-primary-fixed"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        <form className="flex min-h-11 w-full min-w-0 items-center border border-surface-bright bg-surface-container-low px-3 transition-colors focus-within:border-primary-fixed lg:w-auto">
          <Icon name="calendar_month" className="text-lg text-outline" />
          <input
            className="font-body-md text-body-md ml-2 w-full min-w-0 border-none bg-transparent text-on-surface focus:ring-0 lg:w-auto"
            type="month"
            name="month"
            aria-label="Filtrar por mes"
            defaultValue={month ?? ""}
          />
          {hiddenFields.map((field) => (
            <input
              key={field.name}
              type="hidden"
              name={field.name}
              value={field.value}
            />
          ))}
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="font-body-md text-body-md border border-surface-bright bg-surface-container p-space-md text-on-surface-variant">
          No hay torneos que coincidan con este filtro.
        </p>
      ) : (
        <>
          <div className="hidden border border-surface-bright md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-high">
                    <th className="font-label-caps text-label-caps px-4 py-4 text-outline">
                      Torneo
                    </th>
                    <th className="font-label-caps text-label-caps px-4 py-4 text-outline">
                      Estado
                    </th>
                    <th className="font-label-caps text-label-caps px-4 py-4 text-right text-outline">
                      Jugadores
                    </th>
                    <th className="font-label-caps text-label-caps px-4 py-4 text-right text-outline">
                      Arranca
                    </th>
                    <th className="font-label-caps text-label-caps px-4 py-4 text-right text-outline">
                      Por jugador
                    </th>
                    <th className="px-4 py-4">
                      <span className="sr-only">Ver torneo</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-surface-bright/60 transition-colors hover:bg-surface-container-low"
                    >
                      <td className="font-headline-md px-4 py-4 text-xl font-bold text-on-surface">
                        {row.name}
                      </td>
                      <td className="px-4 py-4">
                        <Badge row={row} />
                      </td>
                      <td className="font-headline-md px-4 py-4 text-right text-lg font-bold tabular-nums text-on-surface">
                        {row.players}
                      </td>
                      <td className="font-body-md px-4 py-4 text-right text-on-surface-variant">
                        {row.when}
                      </td>
                      <td
                        className={`font-headline-md px-4 py-4 text-right text-lg font-bold tabular-nums ${feeClasses(
                          row
                        )}`}
                      >
                        {row.fee ?? "A definir"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/torneos/${row.id}`}
                          className="font-label-caps text-label-caps text-primary-fixed transition-colors hover:text-primary-fixed-dim"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* En mobile la tabla se convierte en bloques: seis columnas no entran
              y desplazar de costado esconde justamente el botón de entrar. */}
          <div className="flex flex-col gap-space-sm md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="border border-surface-bright">
                <div className="flex flex-col gap-3 border-b border-surface-bright/60 p-space-sm">
                  <Badge row={row} />
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    {row.name}
                  </h3>
                </div>
                <dl className="grid grid-cols-3 gap-px bg-surface-bright/60">
                  <div className="bg-background px-3 py-3">
                    <dt className="font-label-caps text-label-caps text-outline">
                      Jug.
                    </dt>
                    <dd className="font-headline-md mt-2 text-lg font-bold tabular-nums text-on-surface">
                      {row.players}
                    </dd>
                  </div>
                  <div className="bg-background px-3 py-3">
                    <dt className="font-label-caps text-label-caps text-outline">
                      Arranca
                    </dt>
                    <dd className="font-body-md mt-2 text-sm text-on-surface-variant">
                      {row.when}
                    </dd>
                  </div>
                  <div className="bg-background px-3 py-3">
                    <dt className="font-label-caps text-label-caps text-outline">
                      Jugador
                    </dt>
                    <dd
                      className={`font-headline-md mt-2 text-lg font-bold tabular-nums ${feeClasses(
                        row
                      )}`}
                    >
                      {row.fee ?? "—"}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/torneos/${row.id}`}
                  className="font-label-caps text-label-caps flex min-h-12 items-center justify-center border-t border-surface-bright/60 text-primary-fixed transition-colors hover:bg-surface-container-low"
                >
                  Ver torneo →
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
