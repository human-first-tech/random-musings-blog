export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 bg-ink px-[clamp(24px,5vw,80px)] py-12 text-[0.8rem] text-[oklch(55%_0.01_60)]">
      <div className="font-serif text-[1.1rem] font-medium tracking-[-0.02em] text-[oklch(95%_0.01_60)]">
        Random <span className="text-accent">Musings</span>
      </div>
      <div>Written with honesty &amp; a large cup of chai · Since 2020</div>
    </footer>
  );
}
