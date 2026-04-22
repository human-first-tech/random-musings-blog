// Copy sourced verbatim from the prototype (Random Musings.html §AboutSection).
const LOVES = [
  "Books",
  "Beaches",
  "Bollywood",
  "Baking",
  "Yoga",
  "South Indian food",
  "Chai",
  "Friends (the show)",
  "Long walks",
  "Organizing things",
];

export function AboutSection() {
  return (
    <section
      id="about"
      className="border-t border-rule bg-cream-dark py-[clamp(56px,7vw,80px)]"
    >
      <div className="u-container">
        <div className="grid items-start gap-[clamp(40px,6vw,80px)] md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
              The<br />
              <em className="italic text-accent">woman</em>
              <br />
              behind the
              <br />
              musings
            </h2>
          </div>
          <div>
            <p className="mb-4 text-[1rem] font-light leading-[1.75] text-ink-mid">
              I am a simple introvert who finds joy in the little things — a well-brewed cup of chai, a dog-eared book, the sound of waves on a shore. I grew up on an island, moved around like a nomad, and somewhere along the way started putting words to the thoughts that kept me up at night.
            </p>
            <p className="mb-4 text-[1rem] font-light leading-[1.75] text-ink-mid">
              These pieces are my way of making sense of the world — and of myself. I write about the things that don&apos;t quite have a category: the awkward, the honest, the &ldquo;did anyone else feel this way too?&rdquo; moments of everyday life.
            </p>
            <p className="text-[1rem] font-light leading-[1.75] text-ink-mid">
              I&apos;m a work in progress. And I&apos;ve made peace with that.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {LOVES.map((l) => (
                <span
                  key={l}
                  className="whitespace-nowrap rounded-full border border-rule bg-card px-[14px] py-[5px] text-[0.78rem] text-ink-mid"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
