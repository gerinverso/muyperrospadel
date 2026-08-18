import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { statusLabels, type TournamentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: TournamentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "SETUP", label: statusLabels.SETUP },
  { value: "PAIRS_DONE", label: statusLabels.PAIRS_DONE },
  { value: "IN_PROGRESS", label: statusLabels.IN_PROGRESS },
  { value: "FINISHED", label: statusLabels.FINISHED },
];

const STATUS_BADGE_CLASSES: Record<TournamentStatus, string> = {
  SETUP: "bg-surface-container-highest text-primary-fixed border-primary-fixed/30",
  PAIRS_DONE: "bg-surface-container-highest text-secondary border-secondary/30",
  GROUP_STAGE: "bg-surface-container-highest text-secondary border-secondary/30",
  IN_PROGRESS: "bg-surface-container-highest text-tertiary-fixed border-tertiary-fixed/30",
  FINISHED: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return null;
  return `$${Number(value).toFixed(2)}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string }>;
}) {
  const { status, month } = await searchParams;
  const activeStatus = (status as TournamentStatus | undefined) ?? "ALL";

  let monthRange: { gte: Date; lt: Date } | null = null;
  if (month) {
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    monthRange = { gte: start, lt: end };
  }

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    relationLoadStrategy: "join",
    include: { _count: { select: { players: true } } },
    where: {
      ...(activeStatus !== "ALL" ? { status: activeStatus } : {}),
      ...(monthRange ? { createdAt: monthRange } : {}),
    },
  });

  function filterHref(next: { status?: string; month?: string }) {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextMonth = next.month ?? month;
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextMonth) params.set("month", nextMonth);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow px-margin-mobile py-space-lg md:px-margin-desktop">
      <header className="mb-space-lg flex flex-col items-start justify-between gap-space-md md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile uppercase tracking-tight text-primary-fixed md:font-headline-lg md:text-headline-lg">
            Torneos Activos
          </h1>
          <p className="font-body-lg text-body-lg mt-2 max-w-2xl text-on-surface-variant">
            MATIAS PAVONI JUGADOR REVELACION DEL CLUB
          </p>
        </div>
      </header>

      <section className="card-border mb-space-lg flex flex-col items-center justify-between gap-space-sm rounded-lg bg-surface-container p-space-sm md:flex-row md:gap-space-md md:p-space-md">
        <div className="flex w-full flex-wrap gap-space-sm md:w-auto">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={filterHref({ status: f.value })}
              className={`font-label-caps text-label-caps rounded-full border px-4 py-2 transition-colors ${
                activeStatus === f.value
                  ? "border-primary-fixed bg-primary-fixed/10 text-primary-fixed"
                  : "border-surface-bright text-on-surface-variant hover:border-primary-fixed hover:text-primary-fixed"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form className="flex w-full items-center rounded border border-surface-bright bg-surface-dim p-1 transition-colors focus-within:border-primary-fixed md:w-auto">
          <span className="material-symbols-outlined ml-2 text-on-surface-variant">
            calendar_month
          </span>
          <input
            className="font-body-md text-body-md ml-2 border-none bg-transparent text-on-surface focus:ring-0"
            type="month"
            name="month"
            defaultValue={month ?? ""}
          />
          {status && status !== "ALL" && (
            <input type="hidden" name="status" value={status} />
          )}
        </form>
      </section>

      {tournaments.length === 0 ? (
        <p className="card-border rounded-lg bg-surface-container p-6 text-center text-on-surface-variant">
          No hay torneos que coincidan con este filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const price = formatMoney(t.registrationFee);
            const tStatus = t.status as TournamentStatus;
            return (
              <article
                key={t.id}
                className="card-border neon-glow-hover group flex flex-col overflow-hidden rounded-lg bg-surface-container transition-all duration-300"
              >
                <div className="relative flex h-40 w-full items-center justify-center bg-white p-2">
                  <Image
                    src="/logo.jpg"
                    alt="Muy Perros Pádel"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-contain p-2"
                  />
                  <div
                    className={`font-label-caps text-label-caps absolute left-space-sm top-space-sm rounded border px-2 py-1 ${STATUS_BADGE_CLASSES[tStatus]}`}
                  >
                    {statusLabels[tStatus].toUpperCase()}
                  </div>
                </div>
                <div className="flex flex-grow flex-col p-space-md">
                  <h2 className="font-headline-md text-headline-md mb-space-xs text-on-surface transition-colors group-hover:text-primary-fixed">
                    {t.name}
                  </h2>
                  <div className="font-body-md text-body-md mb-2 flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">
                      group
                    </span>
                    <span>{t._count.players} jugador(es)</span>
                  </div>
                  <div className="font-body-md text-body-md mb-space-md flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">
                      event
                    </span>
                    <span>Creado el {formatDate(t.createdAt)}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-surface-bright pt-space-sm">
                    <div className="flex flex-col">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Inscripción por pareja
                      </span>
                      <span className="font-headline-md text-headline-md text-primary-fixed">
                        {price ?? "A definir"}
                      </span>
                    </div>
                    <Link
                      href={`/torneos/${t.id}`}
                      className="font-label-caps text-label-caps rounded bg-primary-fixed px-6 py-3 font-bold uppercase tracking-wider text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim"
                    >
                      Ver torneo
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
