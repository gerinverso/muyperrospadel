"use client";

import { useState } from "react";
import type { TournamentDetail } from "@/lib/types";

export default function FinanceSection({
  tournament,
  busy,
  onSave,
}: {
  tournament: TournamentDetail;
  busy: boolean;
  onSave: (fee: number, cost: number) => void;
}) {
  const [fee, setFee] = useState(tournament.registrationFee ?? "");
  const [cost, setCost] = useState(tournament.courtCost ?? "");

  const feeNum = Number(fee) || 0;
  const costNum = Number(cost) || 0;
  const prize = feeNum * tournament.players.length - costNum;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(feeNum, costNum);
  }

  return (
    <section className="card-border rounded-lg bg-surface-container p-5">
      <h2 className="mb-3 text-lg font-semibold text-on-surface">
        Inscripción y premio
      </h2>
      <form
        onSubmit={handleSubmit}
        className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-on-surface">
            Inscripción por jugador ($)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-on-surface">
            Costo total de canchas ($)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-md bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50 sm:col-span-2 sm:w-fit"
        >
          Guardar montos
        </button>
      </form>
      <p className="text-sm text-on-surface-variant">
        Recaudado:{" "}
        <strong className="text-on-surface">
          ${(feeNum * tournament.players.length).toFixed(2)}
        </strong>{" "}
        ({tournament.players.length} jugadores) — Canchas:{" "}
        <strong className="text-on-surface">${costNum.toFixed(2)}</strong>
      </p>
      <p className="mt-1 text-lg font-semibold text-primary-fixed">
        Premio: ${prize.toFixed(2)}
      </p>
    </section>
  );
}
