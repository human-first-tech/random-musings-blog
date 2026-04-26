import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SubscribeSection } from "@/components/SubscribeSection";
import { AboutSection } from "@/components/AboutSection";
import { WritingsClient } from "@/components/WritingsClient";
import { getAllPosts, getTopTags } from "@/lib/posts";

export const revalidate = 60;

export const metadata = {
  title: "Writings — Random Musings",
  description: "Browse all essays. Search by title, excerpt, or content.",
};

export default async function WritingsPage() {
  const [posts, tags] = await Promise.all([getAllPosts(), getTopTags(10)]);

  return (
    <>
      <Nav />
      <main className="flex-1 pt-16">
        <section className="py-[clamp(56px,7vw,80px)]">
          <div className="u-container">
            <div className="mb-10">
              <p className="mb-3 text-[0.75rem] font-medium uppercase tracking-[0.15em] text-ink-light">
                Archive
              </p>
              <h1 className="font-serif text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
                Writings
              </h1>
            </div>
            <WritingsClient posts={posts} tags={tags} />
          </div>
        </section>
        <AboutSection />
        <SubscribeSection />
      </main>
      <Footer />
    </>
  );
}
