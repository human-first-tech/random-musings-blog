import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SubscribeSection } from "@/components/SubscribeSection";
import { NotionRenderer } from "@/components/NotionRenderer";
import {
  getAllPosts,
  getAdjacentPosts,
  getPostBySlug,
  type Post,
} from "@/lib/posts";
import { CommentsSection } from "@/components/CommentsSection";

// ISR: re-render at most every 60 seconds when traffic hits this page.
// On-demand revalidation via /api/revalidate handles publish-time freshness.
export const revalidate = 60;

// Allow new slugs added in Notion after build to render on-demand.
export const dynamicParams = true;

type RouteParams = { slug: string };
type Props = { params: Promise<RouteParams> };

export async function generateStaticParams(): Promise<RouteParams[]> {
  // Use lightweight metadata fetch — no blocks needed for slug generation.
  const { fetchAllPostsFromNotion } = await import("@/lib/notion");
  const posts = await fetchAllPostsFromNotion();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found — Random Musings" };
  return {
    title: `${post.title} — Random Musings`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.isoDate,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { prev, next } = await getAdjacentPosts(slug);
  const tag = post.category;

  return (
    <>
      <Nav />
      <main className="flex-1 pt-16">
        <article className="min-h-[calc(100vh-64px)] py-[clamp(48px,7vw,80px)] pb-20">
          <div className="u-container-narrow">
            <Link
              href="/writings"
              className="mb-12 inline-flex items-center gap-2 whitespace-nowrap font-sans text-[0.8rem] font-medium uppercase tracking-[0.08em] text-ink-light transition-colors hover:text-accent"
            >
              ← Back to writings
            </Link>

            <div className="mb-5 flex items-center gap-4">
              <span className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-accent">
                {tag}
              </span>
              <span className="text-[0.72rem] text-ink-light">·</span>
              <span className="whitespace-nowrap text-[0.72rem] tracking-[0.04em] text-ink-light">
                {post.date}
              </span>
            </div>

            <h1 className="mb-6 font-serif text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
              {post.title}
            </h1>

            <blockquote className="mb-12 border-l-[3px] border-accent pl-5 font-serif text-[1.1rem] italic leading-[1.65] text-ink-mid">
              {post.excerpt}
            </blockquote>

            <div className="mb-12 h-px bg-rule" />

            <NotionRenderer blocks={post.blocks} />

            <CommentsSection slug={post.slug} postTitle={post.title} />

            <ArticleNav prev={prev} next={next} />
          </div>
        </article>
        <SubscribeSection />
      </main>
      <Footer />
    </>
  );
}

function ArticleNav({ prev, next }: { prev: Post | null; next: Post | null }) {
  return (
    <nav className="mt-16 grid grid-cols-1 gap-4 border-t border-rule pt-10 md:grid-cols-2">
      {prev ? (
        <Link
          href={`/writings/${prev.slug}`}
          className="rounded-[4px] border border-rule bg-card p-5 text-left transition-colors hover:border-accent hover:bg-white"
        >
          <div className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-light">
            ← Previous
          </div>
          <div className="font-serif text-[0.95rem] leading-[1.3] text-ink">
            {prev.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/writings/${next.slug}`}
          className="rounded-[4px] border border-rule bg-card p-5 text-right transition-colors hover:border-accent hover:bg-white"
        >
          <div className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-light">
            Next →
          </div>
          <div className="font-serif text-[0.95rem] leading-[1.3] text-ink">
            {next.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
