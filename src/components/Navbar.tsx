import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant bg-background/95 px-margin-mobile py-3 backdrop-blur-sm md:px-margin-desktop">
      <div className="flex items-center gap-space-md">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="Muy Perros Pádel"
            width={48}
            height={48}
            priority
            className="h-11 w-11 rounded-lg"
          />
          <span className="font-headline-md text-headline-md hidden font-black uppercase tracking-tighter text-primary-fixed sm:inline">
            Muy Perros Pádel
          </span>
        </Link>
        <div className="ml-space-lg flex gap-space-md">
          <Link
            href="/"
            className="font-body-md text-body-md pb-1 font-bold text-on-surface-variant transition-colors hover:text-primary-fixed"
          >
            Torneos
          </Link>
          <Link
            href="/ranking"
            className="font-body-md text-body-md pb-1 font-bold text-on-surface-variant transition-colors hover:text-primary-fixed"
          >
            Ranking
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <Link
          href="/admin"
          className="font-label-caps text-label-caps rounded bg-surface-container-high px-4 py-2 text-primary-fixed transition-all duration-200 hover:bg-surface-bright"
        >
          Panel Admin
        </Link>
      </div>
    </nav>
  );
}
