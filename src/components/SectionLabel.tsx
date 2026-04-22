export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-10 flex items-center gap-4 text-[0.75rem] font-medium uppercase tracking-[0.18em] text-ink-light">
      <span>{children}</span>
      <span aria-hidden className="h-px flex-1 bg-rule" />
    </div>
  );
}
