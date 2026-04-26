/**
 * Per-article Open Graph image.
 *
 * Renders a 1200x630 image for each article with:
 *   - Site wordmark
 *   - Category chip (accent)
 *   - Article title (Playfair-esque serif)
 *   - Date
 *
 * Uses next/og's ImageResponse, which runs at the edge and renders Tailwind-ish
 * inline styles to PNG. Fonts are loaded from Google Fonts at build time.
 *
 * Falls back to a generic image if the slug isn't found.
 */

import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600; // OG images change less often than article body

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  const title = post?.title ?? "Random Musings";
  const category = post?.category ?? "A personal journal";
  const date = post?.date ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#fdfaf3",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            color: "#2a221b",
            letterSpacing: "-0.5px",
          }}
        >
          <span style={{ fontWeight: 600 }}>Random</span>
          <span style={{ marginLeft: 8, color: "#3f3aa1", fontWeight: 600 }}>
            Musings
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "3px",
              color: "#3f3aa1",
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.1,
              fontWeight: 500,
              letterSpacing: "-2px",
              color: "#2a221b",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "#7d756d",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span>{date}</span>
          <span>d-island-girl.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
