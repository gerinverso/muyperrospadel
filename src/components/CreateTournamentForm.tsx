"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el torneo");
        return;
      }
      setName("");
      router.push(`/admin/tournaments/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
        placeholder="Ej: Torneo de verano 2026"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary-fixed px-4 py-2 font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
      >
        Crear
      </button>
      {error && <p className="text-sm text-error">{error}</p>}
    </form>
  );
}
