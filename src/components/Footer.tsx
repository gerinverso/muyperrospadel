export default function Footer() {
  return (
    <footer className="mt-auto flex w-full flex-col items-center justify-between gap-space-md border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-space-lg md:flex-row md:px-margin-desktop">
      <div className="font-headline-md text-headline-md font-black uppercase tracking-tighter text-primary-fixed">
        Muy Perros Pádel
      </div>
      <div className="font-body-md text-body-md text-sm text-on-surface-variant">
        © {new Date().getFullYear()} Muy Perros Pádel — La comunidad del pádel
      </div>
    </footer>
  );
}
