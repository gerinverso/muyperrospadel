import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import PlayersRoster from "@/components/PlayersRoster";

export default async function AdminPlayersPage() {
  const session = await getSession();
  if (!session.adminName) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header>
        <Link
          href="/admin"
          className="text-sm text-on-surface-variant hover:text-primary-fixed hover:underline"
        >
          ← Volver al panel
        </Link>
        <h1 className="font-headline-md text-headline-md mt-1 text-on-surface">
          Jugadores del club
        </h1>
        <p className="text-sm text-on-surface-variant">
          Este listado se comparte entre todos los torneos: cargá una vez a cada
          jugador y después anotalo con un click en cada torneo nuevo.
        </p>
      </header>

      <PlayersRoster />
    </div>
  );
}
