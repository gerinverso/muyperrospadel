import Link from "next/link";

const LINKS = [
  { href: "/", label: "Torneos" },
  { href: "/ranking", label: "Ranking" },
  { href: "/admin", label: "Panel Admin" },
];

export default function Footer() {
  return (
    <footer className="mt-auto flex w-full flex-col items-start justify-between gap-space-sm border-t border-surface-bright bg-surface-container-lowest px-margin-mobile py-space-md md:flex-row md:items-center md:px-margin-desktop">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-5 w-1 bg-primary-fixed" />
        <span className="font-headline-md text-lg font-black uppercase tracking-tighter text-on-surface">
          Muy Perros Pádel
        </span>
      </div>

      <div className="flex flex-wrap gap-space-md">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="font-label-caps text-label-caps text-outline transition-colors hover:text-primary-fixed"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <span className="font-label-caps text-label-caps text-outline">
        © {new Date().getFullYear()} — German Dev
      </span>
    </footer>
  );
}
