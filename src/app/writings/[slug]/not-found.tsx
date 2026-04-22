import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="flex flex-1 items-center justify-center pt-16">
        <div className="u-container-narrow py-24 text-center">
          <p className="mb-4 text-[0.75rem] font-medium uppercase tracking-[0.15em] text-ink-light">
            Lost
          </p>
          <h1 className="mb-6 font-serif text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
            That musing isn&apos;t here.
          </h1>
          <p className="mb-10 text-[1rem] font-light text-ink-mid">
            It may have been moved, renamed, or never written at all.
          </p>
          <Link
            href="/writings"
            className="inline-block rounded-[4px] border border-rule bg-card px-8 py-3 text-[0.85rem] tracking-[0.04em] text-ink-mid transition-colors hover:border-accent hover:text-accent"
          >
            Back to writings
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
