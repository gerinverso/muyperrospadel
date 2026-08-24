"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";

const LINKS = [
  { href: "/", label: "Torneos" },
  { href: "/ranking", label: "Ranking" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-outline-variant bg-background/95 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between gap-space-sm px-margin-mobile py-3 md:px-margin-desktop">
        {/* min-w-0 + shrink-0 en el logo: sin eso flexbox achica la imagen hasta
            0px de ancho en pantallas de 360px y el logo desaparece. */}
        <div className="flex min-w-0 items-center gap-space-md">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="Muy Perros Pádel"
              width={48}
              height={48}
              priority
              className="h-11 w-11 shrink-0 rounded-lg"
            />
            <span className="font-headline-md truncate text-base font-black uppercase tracking-tighter text-primary-fixed sm:text-headline-md">
              Muy Perros Pádel
            </span>
          </Link>

          <div className="ml-space-lg hidden gap-space-md md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-body-md text-body-md pb-1 font-bold text-on-surface-variant transition-colors hover:text-primary-fixed"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-space-md">
          <Link
            href="/admin"
            className="font-label-caps text-label-caps hidden rounded bg-surface-container-high px-4 py-2 text-primary-fixed transition-all duration-200 hover:bg-surface-bright md:block"
          >
            Panel Admin
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 items-center justify-center rounded bg-surface-container-high text-xl text-primary-fixed transition-colors hover:bg-surface-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fixed md:hidden"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>

      {/* Navegar cierra el panel: en mobile tapa media pantalla y quedaría
          abierto encima de la página nueva. */}
      {open && (
        <div
          id="menu-mobile"
          className="flex flex-col border-t border-outline-variant px-margin-mobile py-space-xs md:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-body-md text-body-md border-b border-surface-bright/50 py-3 font-bold text-on-surface-variant transition-colors hover:text-primary-fixed"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="font-label-caps text-label-caps mt-space-xs rounded bg-surface-container-high px-4 py-3 text-center text-primary-fixed transition-colors hover:bg-surface-bright"
          >
            Panel Admin
          </Link>
        </div>
      )}
    </nav>
  );
}
