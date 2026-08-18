import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant bg-background/95 px-margin-mobile py-4 backdrop-blur-sm md:px-margin-desktop">
      <div className="flex items-center gap-space-md">
        <Link
          href="/"
          className="font-headline-md text-headline-md font-black uppercase tracking-tighter text-primary-fixed"
        >
          Muy Perros Pádel
        </Link>
        <div className="ml-space-lg hidden gap-space-md md:flex">
          <Link
            href="/"
            className="font-body-md text-body-md border-b-2 border-primary-fixed pb-1 font-bold text-primary-fixed"
          >
            Torneos
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
