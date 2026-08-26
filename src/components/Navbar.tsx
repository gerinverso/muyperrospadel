"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

const LINKS: { href: string; label: string; activeOn?: string }[] = [
  { href: "/", label: "Torneos", activeOn: "/" },
  { href: "/ranking", label: "Ranking", activeOn: "/ranking" },
  { href: "/#como-funciona", label: "Cómo funciona" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // El ancla a una seccion de la home nunca queda marcada: no hay forma de
  // saber desde el router si estas mirando esa seccion.
  const isActive = (link: (typeof LINKS)[number]) => {
    if (!link.activeOn) return false;
    if (link.activeOn === "/") return pathname === "/";
    return pathname.startsWith(link.activeOn);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-surface-bright bg-background/95 backdrop-blur-sm">
      <div className="flex h-[68px] items-stretch justify-between gap-space-sm">
        {/* min-w-0 + shrink-0 en el logo: sin eso flexbox achica la imagen hasta
            0px de ancho en pantallas de 360px y el logo desaparece. */}
        <div className="flex min-w-0 items-stretch gap-space-lg pl-margin-mobile md:pl-margin-desktop">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="h-8 w-1.5 shrink-0 bg-primary-fixed"
            />
            <Image
              src="/logo.jpg"
              alt="Muy Perros Pádel"
              width={40}
              height={40}
              priority
              className="h-9 w-9 shrink-0 rounded-none"
            />
            <span className="font-headline-md truncate text-base font-black uppercase tracking-tighter text-on-surface sm:text-xl">
              Muy Perros Pádel
            </span>
          </Link>

          <div className="hidden items-stretch md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`font-label-caps text-label-caps flex items-center border-b-2 px-4 transition-colors ${
                  isActive(l)
                    ? "border-primary-fixed text-primary-fixed"
                    : "border-transparent text-outline hover:text-primary-fixed"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-stretch">
          <Link
            href="/admin"
            className="font-label-caps text-label-caps hidden items-center border-l border-surface-bright px-8 text-on-surface-variant transition-colors hover:text-primary-fixed md:flex"
          >
            Panel Admin
          </Link>

          <div className="flex items-center pr-margin-mobile md:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="flex h-11 w-11 items-center justify-center border border-surface-bright text-xl text-primary-fixed transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fixed"
            >
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </div>

      {/* Navegar cierra el panel: en mobile tapa media pantalla y quedaría
          abierto encima de la página nueva. */}
      {open && (
        <div
          id="menu-mobile"
          className="flex flex-col border-t border-surface-bright bg-surface-container-lowest md:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`font-label-caps text-label-caps border-b border-surface-bright px-margin-mobile py-4 transition-colors ${
                isActive(l)
                  ? "text-primary-fixed"
                  : "text-on-surface-variant hover:text-primary-fixed"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="font-label-caps text-label-caps bg-primary-fixed px-margin-mobile py-4 text-center text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim"
          >
            Panel Admin
          </Link>
        </div>
      )}
    </nav>
  );
}
