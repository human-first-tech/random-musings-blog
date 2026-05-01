"use client";

import { useEffect, useRef, useState } from "react";

type Comment = { name: string; comment: string; submittedAt: string };
type Status = "idle" | "submitting" | "success" | "error";

export function CommentsSection({ slug, postTitle }: { slug: string; postTitle: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {});
  }, [slug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        comment,
        slug,
        postTitle,
        website: honeypotRef.current?.value ?? "",
      }),
    });

    const data = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !data.ok) {
      setStatus("error");
      setErrorMsg(data.error ?? "Something went wrong — please try again.");
    } else {
      setStatus("success");
      setName("");
      setComment("");
    }
  }

  return (
    <section className="mt-16 border-t border-rule pt-12">
      <h2 className="mb-8 font-sans text-[0.75rem] font-medium uppercase tracking-[0.15em] text-ink-light">
        Thoughts &amp; reflections
      </h2>

      {comments.length === 0 ? (
        <p className="mb-10 text-[0.9rem] font-light italic text-ink-light">
          Be the first to leave a thought.
        </p>
      ) : (
        <ul className="mb-12 space-y-6">
          {comments.map((c, i) => (
            <li key={i} className="border-b border-rule pb-6 last:border-0">
              <div className="mb-1.5 flex items-center gap-3">
                <span className="font-sans text-[0.85rem] font-medium text-ink">{c.name}</span>
                <span className="text-[0.72rem] text-ink-light">{c.submittedAt}</span>
              </div>
              <p className="text-[0.92rem] font-light leading-[1.75] text-ink-mid">{c.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {status === "success" ? (
        <div className="rounded-[6px] border border-rule bg-card px-6 py-5">
          <p className="mb-1 font-serif text-[1rem] text-ink">Your comment is in — thank you!</p>
          <p className="text-[0.83rem] font-light text-ink-light">It will appear once approved.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <input
            ref={honeypotRef}
            name="website"
            type="text"
            tabIndex={-1}
            aria-hidden
            className="absolute opacity-0 pointer-events-none"
            autoComplete="off"
          />
          <div>
            <label
              htmlFor="comment-name"
              className="mb-1.5 block font-sans text-[0.72rem] font-medium uppercase tracking-[0.1em] text-ink-light"
            >
              Name
            </label>
            <input
              id="comment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="Your name"
              className="w-full max-w-[320px] rounded-[6px] border border-rule bg-card px-4 py-2.5 font-sans text-[0.875rem] text-ink outline-none transition-colors placeholder:text-ink-light focus:border-accent"
            />
          </div>
          <div>
            <label
              htmlFor="comment-body"
              className="mb-1.5 block font-sans text-[0.72rem] font-medium uppercase tracking-[0.1em] text-ink-light"
            >
              Comment
            </label>
            <textarea
              id="comment-body"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              maxLength={1000}
              rows={4}
              placeholder="What did this piece make you feel?"
              className="w-full rounded-[6px] border border-rule bg-card px-4 py-3 font-sans text-[0.875rem] text-ink outline-none transition-colors placeholder:text-ink-light focus:border-accent"
            />
          </div>
          {errorMsg && <p role="alert" className="text-[0.8rem] text-accent">{errorMsg}</p>}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-[6px] bg-accent px-6 py-2.5 font-sans text-[0.875rem] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {status === "submitting" ? "Posting…" : "Post comment →"}
          </button>
        </form>
      )}
    </section>
  );
}
