"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function SubscribeSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg(null);

    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({ ok: false }));

    if (!res.ok || !data.ok) {
      setStatus('error');
      setErrorMsg(data.error ?? 'Something went wrong — please try again.');
    } else {
      setStatus('success');
    }
  }

  const isError = status === "error";

  return (
    <section className="border-t border-rule bg-cream px-[clamp(24px,5vw,80px)] py-[clamp(56px,8vw,96px)]">
      <div className="mx-auto max-w-[640px] rounded-[12px] border border-rule bg-card p-[clamp(36px,5vw,56px)] text-center">
        <p className="mb-3.5 text-[0.75rem] font-medium uppercase tracking-[0.15em] text-accent">
          Stay in the loop
        </p>
        <h2 className="mb-3 font-serif text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1.2] tracking-[-0.03em] text-ink">
          New musings,{" "}
          <em className="italic text-accent">straight to you</em>
        </h2>
        <p className="mx-auto mb-7 max-w-[420px] text-[0.92rem] font-light leading-[1.75] text-ink-mid">
          No algorithms, no noise. Just a quiet email when something new is written — the kind you&apos;ll want to read with your morning chai.
        </p>

        {status === "success" ? (
          <div className="py-5">
            <div className="mb-2.5 text-[1.4rem] text-accent">✦</div>
            <p className="mb-1.5 font-serif text-[1.1rem] text-ink">You&apos;re in!</p>
            <p className="text-[0.85rem] font-light text-ink-mid">
              Thank you — the next musing will find its way to your inbox soon.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-[420px] gap-2.5"
            noValidate
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "idle") setStatus("idle");
              }}
              placeholder="your@email.com"
              className={`flex-1 rounded-[6px] border bg-cream px-4 py-[11px] font-sans text-[0.875rem] text-ink outline-none transition-colors focus:border-accent ${
                isError ? "border-accent" : "border-rule"
              }`}
              aria-invalid={isError}
              aria-describedby={isError ? "subscribe-error" : undefined}
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="whitespace-nowrap rounded-[6px] bg-accent px-[22px] py-[11px] font-sans text-[0.875rem] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Subscribe →"}
            </button>
          </form>
        )}

        {isError && (
          <p
            id="subscribe-error"
            className="mt-3 text-[0.8rem] text-accent"
            role="alert"
          >
            {errorMsg ?? "Something went wrong — please try again."}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-6">
          {["No spam, ever", "Unsubscribe anytime", "Free"].map((t) => (
            <div
              key={t}
              className="flex items-center gap-1.5 whitespace-nowrap text-[0.75rem] text-ink-light"
            >
              <span className="text-[0.65rem] text-accent">✦</span> {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
