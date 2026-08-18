import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminTournamentPanel from "@/components/AdminTournamentPanel";

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.adminName) {
    redirect("/admin/login");
  }
  const { id } = await params;

  return <AdminTournamentPanel tournamentId={id} />;
}
