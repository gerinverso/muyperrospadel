"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="card-border w-full max-w-sm rounded-lg bg-surface-container p-6"
      >
        <h1 className="font-headline-md text-headline-md mb-1 text-on-surface">
          Acceso administrador
        </h1>
        <p className="mb-5 text-sm text-on-surface-variant">
          Muy Perros Pádel — panel de organizador
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-on-surface">
            Usuario
          </span>
          <input
            className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-on-surface">
            Contraseña
          </span>
          <input
            type="password"
            className="w-full rounded-md border border-surface-bright bg-surface-dim px-3 py-2 text-on-surface outline-none focus:border-primary-fixed"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="mb-4 text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary-fixed px-4 py-2 font-medium text-on-primary-fixed hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
