import Link from "next/link";
import type { Post } from "@/lib/posts";

type Variant = "featured" | "grid";

export function PostCard({ post, variant = "grid" }: { post: Post; variant?: Variant }) {
  if (variant === "featured") return <FeaturedCard post={post} />;
  return <GridCard post={post} />;
}

function FeaturedCard({ post }: { post: Post }) {
  const tag = post.tags[0];
  return (
    <Link
      href={`/writings/${post.slug}`}
      className="group relative block overflow-hidden rounded-[6px] border border-rule bg-card p-[clamp(28px,4vw,44px)] transition-colors hover:bg-white"
    >
      <CardTag name={tag} />
      <h2 className="mb-3 font-serif text-[clamp(1.3rem,2.5vw,1.7rem)] font-medium leading-[1.25] tracking-[-0.02em] text-ink">
        {post.title}
      </h2>
      <p className="mb-5 line-clamp-3 text-[0.9rem] font-light leading-[1.65] text-ink-mid">
        {post.excerpt}
      </p>
      <span className="text-[0.75rem] tracking-[0.04em] text-ink-light">{post.date}</span>
      <CardArrow />
    </Link>
  );
}

function GridCard({ post }: { post: Post }) {
  const tag = post.tags[0];
  const shortDate = post.date.split(",")[1]?.trim() ?? post.date;

  return (
    <Link
      href={`/writings/${post.slug}`}
      className="group relative flex flex-col rounded-[6px] border border-rule bg-card px-9 py-8 transition-colors hover:bg-white"
    >
      <div className="mb-3 text-[0.68rem] font-medium tracking-[0.08em] text-ink-light">
        {shortDate}
      </div>
      <h3 className="mb-2.5 font-serif text-[1.05rem] font-medium leading-[1.25] tracking-[-0.02em] text-ink">
        {post.title}
      </h3>
      <p className="mb-4 line-clamp-3 flex-1 text-[0.85rem] font-light leading-[1.65] text-ink-mid">
        {post.excerpt}
      </p>
      <div className="flex items-center justify-between">
        <CardTag name={tag} inline />
        <span className="flex h-7 w-7 items-center justify-center text-[0.9rem] text-accent opacity-0 transition-opacity group-hover:opacity-100">
          →
        </span>
      </div>
    </Link>
  );
}

function CardTag({ name, inline = false }: { name: string; inline?: boolean }) {
  const isSage = /sage|nature|environment/.test(name);
  const color = isSage ? "text-sage" : "text-accent";
  return (
    <span
      className={`inline-block text-[0.7rem] font-medium uppercase tracking-[0.12em] ${color} ${
        inline ? "" : "mb-3.5"
      }`}
    >
      {name}
    </span>
  );
}

function CardArrow() {
  return (
    <span className="absolute bottom-7 right-7 flex h-9 w-9 translate-x-1 translate-y-1 items-center justify-center rounded-full border border-rule text-base text-accent opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100">
      →
    </span>
  );
}
