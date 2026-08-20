"use client";

import { useState } from "react";
import type { TournamentDetail } from "@/lib/types";

/**
 * Convierte el ISO que guarda la base al formato que espera un input
 * `datetime-local`, en la hora local del navegador. Como el organizador está
 * en Argentina, su hora local ES la hora del torneo.
 */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Anuncio del torneo: fecha de inicio y apertura de inscripciones.
 *
 * Mientras las inscripciones estén abiertas aparece la barra de anuncio en toda
 * la web y cualquiera puede anotarse solo con su DNI. Cerrarlas no cambia el
 * estado del torneo: el sorteo se hace igual que siempre, cuando el organizador
 * quiera.
 */
export default function RegistrationSection({
  tournament,
  busy,
  onSave,
}: {
  tournament: TournamentDetail;
  busy: boolean;
  onSave: (payload: {
    startsAt?: string | null;
    registrationOpen?: boolean;
  }) => void;
}) {
  const [startsAt, setStartsAt] = useState(
    toLocalInputValue(tournament.startsAt)
  );

  const isSetup = tournament.status === "SETUP";
  const open = tournament.registrationOpen;
  // Las dos condiciones que pide el anuncio de la portada. Tenerlas separadas
  // evita que el panel diga "se está anunciando" cuando el flag quedó prendido
  // pero el torneo ya paso del sorteo y por lo tanto no se anuncia.
  const announcing = open && isSetup;

  function handleSaveDate(e: React.FormEvent) {
    e.preventDefault();
    // El input da hora local; se manda el instante absoluto para que el
    // servidor (que corre en UTC) guarde el momento correcto.
    onSave({ startsAt: startsAt ? new Date(startsAt).toISOString() : null });
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <h2 className="mb-3 text-lg font-semibold text-on-surface">
        Anuncio e inscripciones
      </h2>

      <form
        onSubmit={handleSaveDate}
        className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-on-surface">
            Fecha y hora de inicio
          </span>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          Guardar fecha
        </button>
      </form>

      <div className="flex flex-col gap-3 border-t border-surface-bright pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-on-surface">
            {announcing
              ? "Anunciándose en el inicio"
              : open
                ? "Inscripciones abiertas, pero sin anuncio"
                : "Inscripciones cerradas"}
          </p>
          <p className="text-sm text-on-surface-variant">
            {announcing
              ? `Aparece en la portada con el botón para anotarse. Hay ${tournament.players.length} jugador(es) anotado(s).`
              : open
                ? "Ya se sortearon las parejas, así que el torneo no se anuncia ni acepta inscripciones. Cerralas para dejarlo prolijo."
                : isSetup
                  ? "Abrilas y el torneo se anuncia en el inicio para que cada jugador se anote solo con su DNI."
                  : "Ya se sortearon las parejas: no se pueden reabrir."}
          </p>
        </div>
        <button
          onClick={() => {
            if (
              open &&
              !confirm(
                "Cerrar las inscripciones saca el anuncio de la web y nadie más va a poder anotarse solo. ¿Continuar?"
              )
            ) {
              return;
            }
            onSave({ registrationOpen: !open });
          }}
          disabled={busy || (!open && !isSetup)}
          className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            open
              ? "border border-surface-bright text-on-surface hover:bg-surface-container-high"
              : "bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim"
          }`}
        >
          {open ? "Cerrar inscripciones" : "Abrir inscripciones"}
        </button>
      </div>
    </section>
  );
}
