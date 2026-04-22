"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Scroll > 20px → solid frosted border. Matches README §Interactions.
const SCROLL_THRESHOLD = 20;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[100] flex h-16 items-center justify-between px-[clamp(24px,5vw,80px)] backdrop-blur-[12px] transition-colors ${
        scrolled
          ? "bg-[oklch(97%_0.012_60/0.92)] border-b border-rule"
          : "bg-[oklch(97%_0.012_60/0.6)] border-b border-transparent"
      }`}
    >
      <Link
        href="/"
        className="whitespace-nowrap font-serif text-[1.25rem] font-semibold tracking-[-0.02em] text-ink"
      >
        Random <span className="text-accent">Musings</span>
      </Link>
      <ul className="hidden items-center gap-8 md:flex">
        <NavLink href="/">Home</NavLink>
        <NavLink href="/writings">Writings</NavLink>
        <NavLink href="/#about">About</NavLink>
      </ul>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[0.875rem] font-normal uppercase tracking-[0.03em] text-ink-mid transition-colors hover:text-accent"
      >
        {children}
      </Link>
    </li>
  );
}
