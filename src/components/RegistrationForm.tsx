"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

type Result = { name: string; alreadyRegistered: boolean };

/**
 * Formulario de auto-inscripcion. Pide lo minimo: DNI y nombre.
 *
 * El DNI es lo que identifica a la persona, asi que si ya se anotó antes con
 * ese mismo DNI el servidor reutiliza su jugador y le respeta el nombre que ya
 * tenia cargado. Por eso la confirmacion muestra el nombre que devolvio el
 * servidor y no el que se acaba de tipear.
 */
export default function RegistrationForm({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const router = useRouter();
  const [dni, setDni] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No pudimos completar la inscripción");
        return;
      }
      setResult(data);
      // Refresca el contador de anotados del anuncio y de la pagina.
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className="card-border rounded-lg bg-surface-container p-space-md text-center">
        <Icon name="check_circle" className="text-4xl text-primary-fixed" />
        <p className="font-headline-md text-headline-md mt-2 text-on-surface">
          {result.alreadyRegistered
            ? `${result.name}, ya estabas anotado`
            : `¡Listo, ${result.name}!`}
        </p>
        <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
          {result.alreadyRegistered
            ? "No hace falta que te anotes de nuevo."
            : "Quedaste anotado. Las parejas se sortean cuando cierren las inscripciones."}
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-border flex flex-col gap-space-sm rounded-lg bg-surface-container p-space-md"
    >
      <h2 className="font-headline-md text-headline-md text-on-surface">
        Anotarme
      </h2>

      {error && (
        <p className="rounded-md bg-error-container px-4 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-label-caps text-label-caps text-on-surface-variant">
          DNI
        </span>
        <input
          className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
          placeholder="12345678"
          inputMode="numeric"
          autoComplete="off"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-label-caps text-label-caps text-on-surface-variant">
          Nombre y apellido
        </span>
        <input
          className="rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
          placeholder="Matias Pavoni"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="font-label-caps text-label-caps mt-space-xs rounded bg-primary-fixed px-6 py-3 font-bold uppercase tracking-wider text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim disabled:opacity-50"
      >
        {busy ? "Anotando..." : "Anotarme"}
      </button>

      <p className="text-xs text-on-surface-variant">
        Usamos el DNI para no mezclarte con otro jugador que se llame igual.
      </p>
    </form>
  );
}
