import { prisma } from "@/lib/prisma";
import { statusLabels, type TournamentStatus } from "@/lib/types";
import { formatFee, formatShortDate } from "@/lib/format";
import { nextOpenTournament } from "@/lib/next-tournament";
import { finishedSeasons, seasonRanking } from "@/lib/ranking-query";
import TournamentHero from "@/components/TournamentHero";
import HowItWorks from "@/components/HowItWorks";
import RankingBoard from "@/components/RankingBoard";
import TournamentsList, {
  type TournamentRow,
} from "@/components/TournamentsList";
import JoinCta from "@/components/JoinCta";

export const dynamic = "force-dynamic";

/**
 * Etiquetas cortas, distintas de `statusLabels`: en el control segmentado cinco
 * etiquetas largas no entran ni en desktop. El nombre completo del estado sigue
 * apareciendo en la fila de cada torneo.
 */
const STATUS_FILTERS: { value: TournamentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "SETUP", label: "Cargando" },
  { value: "PAIRS_DONE", label: "Parejas" },
  { value: "IN_PROGRESS", label: "En juego" },
  { value: "FINISHED", label: "Terminados" },
];

/** Cuántos jugadores del ranking se muestran en la home antes de "tabla completa". */
const RANKING_ROWS = 8;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string; temporada?: string }>;
}) {
  const { status, month, temporada } = await searchParams;
  const activeStatus = (status as TournamentStatus | undefined) ?? "ALL";

  let monthRange: { gte: Date; lt: Date } | null = null;
  if (month) {
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    monthRange = { gte: start, lt: end };
  }

  const seasons = await finishedSeasons();
  const parsedSeason = Number(temporada);
  const season =
    Number.isInteger(parsedSeason) && seasons.includes(parsedSeason)
      ? parsedSeason
      : seasons[0];

  // El filtro de mes acota el universo entero ("N de M"); el de estado sólo la
  // lista, para que el contador diga cuántos quedaron afuera del filtro.
  const monthWhere = monthRange ? { createdAt: monthRange } : {};

  const [nextTournament, ranking, tournaments, total] = await Promise.all([
    nextOpenTournament(),
    seasonRanking(season),
    prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
      relationLoadStrategy: "join",
      where: {
        ...monthWhere,
        ...(activeStatus !== "ALL" ? { status: activeStatus } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        startsAt: true,
        registrationFee: true,
        _count: { select: { players: true } },
      },
    }),
    prisma.tournament.count({ where: monthWhere }),
  ]);

  function hrefWith(next: {
    status?: string;
    month?: string;
    temporada?: string;
  }) {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextMonth = next.month ?? month;
    const nextSeason = next.temporada ?? temporada;
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextMonth) params.set("month", nextMonth);
    if (nextSeason) params.set("temporada", nextSeason);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  const rows: TournamentRow[] = tournaments.map((t) => {
    const tStatus = t.status as TournamentStatus;
    return {
      id: t.id,
      name: t.name,
      status: tStatus,
      statusLabel: statusLabels[tStatus],
      players: t._count.players,
      when: t.startsAt ? formatShortDate(t.startsAt) : "Sin fecha",
      fee: formatFee(t.registrationFee),
    };
  });

  const hiddenFields = [
    ...(activeStatus !== "ALL"
      ? [{ name: "status", value: activeStatus }]
      : []),
    ...(temporada ? [{ name: "temporada", value: temporada }] : []),
  ];

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow">
      {/* El título de la página existe para lectores de pantalla y buscadores:
          en la pantalla el primer bloque es el anuncio del próximo torneo, que
          dice mucho más que un encabezado genérico. */}
      <h1 className="sr-only">
        Muy Perros Pádel — torneos, ranking e inscripciones
      </h1>

      {nextTournament && <TournamentHero tournament={nextTournament} />}

      <HowItWorks />

      <RankingBoard
        rows={ranking.slice(0, RANKING_ROWS)}
        season={season}
        seasons={seasons}
        hrefForSeason={(y) => hrefWith({ temporada: String(y) })}
      />

      <TournamentsList
        rows={rows}
        total={total}
        activeStatus={activeStatus}
        month={month}
        hiddenFields={hiddenFields}
        filters={STATUS_FILTERS.map((f) => ({
          ...f,
          href: hrefWith({ status: f.value }),
        }))}
      />

      {nextTournament && <JoinCta tournament={nextTournament} />}
    </main>
  );
}
