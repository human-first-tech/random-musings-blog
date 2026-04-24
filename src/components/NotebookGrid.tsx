import Link from "next/link";
import { PostCard } from "./PostCard";
import { SectionLabel } from "./SectionLabel";
import { getAllPosts } from "@/lib/posts";

export function NotebookGrid() {
  const all = getAllPosts();
  const preview = all.slice(0, 6);

  return (
    <section className="py-[clamp(56px,7vw,80px)]">
      <div className="u-container">
        <div className="mb-10 flex items-center justify-between gap-6">
          <div className="flex flex-1 items-center gap-4 text-[0.75rem] font-medium uppercase tracking-[0.18em] text-ink-light">
            <span>From the notebook</span>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          <Link
            href="/writings"
            className="whitespace-nowrap text-[0.8rem] font-medium uppercase tracking-[0.08em] text-accent hover:opacity-80"
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {preview.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/writings"
            className="inline-block rounded-[4px] border border-rule bg-card px-8 py-3 text-[0.85rem] tracking-[0.04em] text-ink-mid transition-colors hover:border-accent hover:text-accent"
          >
            Read all {all.length} pieces
          </Link>
        </div>
      </div>
    </section>
  );
}
