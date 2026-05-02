import { getAllPosts } from "@/lib/posts";

export async function Hero() {
  const count = (await getAllPosts()).length;

  return (
    <section className="border-b border-rule pt-[clamp(72px,10vw,120px)] pb-[clamp(60px,8vw,96px)]">
      <div className="u-container">
        <p className="mb-5 font-sans text-[0.8rem] font-medium uppercase tracking-[0.15em] text-accent">
          A personal journal
        </p>
        <h1 className="mb-6 font-serif text-[clamp(3rem,7vw,5.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-ink">
          Thoughts, stories
          <br />&amp; <em className="italic text-accent">random musings</em>
        </h1>
        <p className="mb-10 max-w-[560px] text-[clamp(1rem,2vw,1.2rem)] font-light leading-[1.7] text-ink-mid">
          An introvert&apos;s unfiltered take on life, people, books, food, and the beautiful chaos of figuring it all out — one story at a time.
        </p>
        <div className="flex flex-wrap gap-2">
          <HeroTag>{count} Pieces</HeroTag>
          <HeroTag variant="sage">Books &amp; Life</HeroTag>
          <HeroTag>Self-discovery</HeroTag>
          <HeroTag variant="sage">Pop culture</HeroTag>
          <HeroTag>Personal growth</HeroTag>
        </div>
      </div>
    </section>
  );
}

function HeroTag({
  children,
  variant = "accent",
}: {
  children: React.ReactNode;
  variant?: "accent" | "sage";
}) {
  const palette =
    variant === "sage"
      ? "bg-sage-soft text-sage"
      : "bg-accent-soft text-accent";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-[14px] py-[5px] text-[0.78rem] font-medium tracking-[0.02em] ${palette}`}
    >
      {children}
    </span>
  );
}
