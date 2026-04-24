import { PostCard } from "./PostCard";
import { SectionLabel } from "./SectionLabel";
import { getFeaturedPosts } from "@/lib/posts";

export function FeaturedGrid() {
  const posts = getFeaturedPosts(3);
  return (
    <section className="border-b border-rule py-[clamp(56px,7vw,80px)]">
      <div className="u-container">
        <SectionLabel>Fresh off the pen</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} variant="featured" />
          ))}
        </div>
      </div>
    </section>
  );
}
