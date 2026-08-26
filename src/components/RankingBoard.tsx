import Link from "next/link";
import type { RankingRow } from "@/lib/ranking";

/**
 * Los tres primeros escalones de puntaje se marcan con un recuadro. Van por
 * escalon (`tier`) y no por posicion: los puntos se reparten por pareja, asi que
 * siempre hay al menos dos jugadores empatados y por posicion nunca habria un
 * segundo puesto.
 */
function rankBoxClasses(tier: number): string {
  if (tier === 0) return "bg-primary-fixed text-on-primary-fixed";
  if (tier <= 2) return "border border-primary-fixed text-primary-fixed";
  return "text-outline";
}

export default function RankingBoard({
  rows,
  season,
  seasons,
  hrefForSeason,
}: {
  rows: RankingRow[];
  season: number;
  seasons: number[];
  hrefForSeason: (season: number) => string;
}) {
  return (
    <section className="border-b border-surface-bright px-margin-mobile py-space-lg md:px-margin-desktop">
      <div className="mb-space-md flex flex-col items-start justify-between gap-space-sm md:flex-row md:items-end">
        <div className="flex flex-wrap items-center gap-space-sm">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile uppercase tracking-tight text-on-surface md:font-headline-lg md:text-headline-lg">
            Ranking
          </h2>
          {seasons.length > 1 && (
            <div className="flex w-fit border border-surface-bright">
              {seasons.map((y) => (
                <Link
                  key={y}
                  href={hrefForSeason(y)}
                  className={`font-label-caps text-label-caps flex min-h-9 items-center border-r border-surface-bright px-4 tabular-nums transition-colors last:border-r-0 ${
                    y === season
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : "text-outline hover:text-primary-fixed"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/ranking"
          className="font-label-caps text-label-caps flex min-h-11 items-center text-primary-fixed transition-colors hover:text-primary-fixed-dim"
        >
          Tabla completa →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="font-body-md text-body-md border border-surface-bright bg-surface-container p-space-md text-on-surface-variant">
          Todavía no hay torneos terminados en la temporada {season}. El ranking
          se arma solo cuando un torneo llega a tener campeón.
        </p>
      ) : (
        <div className="border border-surface-bright">
          {/* En mobile la tabla no entra: seis columnas contra 360px de
              pantalla. Se desplaza de costado, y lo decimos en vez de dejar que
              el número cortado en el borde sea la única pista. */}
          <p className="font-label-caps text-label-caps border-b border-surface-bright px-4 py-3 text-outline sm:hidden">
            Deslizá la tabla para ver títulos y finales →
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="font-label-caps text-label-caps px-4 py-4 text-outline">
                    Pos
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-4 text-outline">
                    Jugador
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-4 text-right text-outline">
                    Torneos
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-4 text-right text-outline">
                    Títulos
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-4 text-right text-outline">
                    Finales
                  </th>
                  <th className="font-label-caps text-label-caps px-4 py-4 text-right text-outline">
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.player.id}
                    className={`border-t border-surface-bright/60 ${
                      index % 2 === 0 ? "bg-surface-container-low" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`font-headline-md inline-flex h-9 w-9 items-center justify-center text-lg font-bold tabular-nums ${rankBoxClasses(
                          row.tier
                        )}`}
                      >
                        {row.position}
                      </span>
                    </td>
                    <td className="font-headline-md px-4 py-3 text-lg font-bold text-on-surface">
                      {row.player.name}
                    </td>
                    <td className="font-body-md px-4 py-3 text-right tabular-nums text-on-surface-variant">
                      {row.tournaments}
                    </td>
                    <td
                      className={`font-body-md px-4 py-3 text-right tabular-nums ${
                        row.titles > 0 ? "text-primary-fixed" : "text-outline"
                      }`}
                    >
                      {row.titles}
                    </td>
                    <td className="font-body-md px-4 py-3 text-right tabular-nums text-on-surface-variant">
                      {row.finals}
                    </td>
                    <td
                      className={`font-headline-md px-4 py-3 text-right text-xl font-bold tabular-nums ${
                        row.tier === 0 ? "text-primary-fixed" : "text-on-surface"
                      }`}
                    >
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
