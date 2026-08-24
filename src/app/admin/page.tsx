import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusLabels, type TournamentStatus } from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";
import CreateTournamentForm from "@/components/CreateTournamentForm";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session.adminName) {
    redirect("/admin/login");
  }

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    relationLoadStrategy: "join",
    include: { _count: { select: { players: true } } },
  });

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Panel de administrador
            </h1>
            <p className="text-sm text-on-surface-variant">
              Hola, {session.adminName} 👋
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/jugadores"
              className="card-border rounded-lg bg-surface-container px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high"
            >
              Jugadores del club
            </Link>
            <LogoutButton />
          </div>
        </header>

        <div className="card-border mb-8 rounded-lg bg-surface-container p-5">
          <h2 className="mb-3 text-lg font-semibold text-on-surface">
            Nuevo torneo
          </h2>
          <CreateTournamentForm />
        </div>

        <h2 className="mb-3 text-lg font-semibold text-on-surface">
          Torneos
        </h2>
        {tournaments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-surface-bright bg-surface-container p-6 text-center text-on-surface-variant">
            Todavía no hay torneos creados.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="card-border flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container p-4 transition hover:border-primary-fixed"
                >
                  <div>
                    <p className="font-semibold text-on-surface">{t.name}</p>
                    <p className="text-sm text-on-surface-variant">
                      {t._count.players} jugador(es)
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">
                    {statusLabels[t.status as TournamentStatus]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
