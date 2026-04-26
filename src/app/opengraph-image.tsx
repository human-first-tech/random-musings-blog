/**
 * Default site-wide Open Graph image — used for the homepage and any page
 * that doesn't define its own opengraph-image.
 */

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Random Musings — A personal journal";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "72px 80px",
          background: "#fdfaf3",
          fontFamily: "Georgia, serif",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 24,
            textTransform: "uppercase",
            letterSpacing: "4px",
            color: "#3f3aa1",
            marginBottom: 32,
          }}
        >
          A personal journal
        </div>
        <div
          style={{
            fontSize: 96,
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: "-3px",
            color: "#2a221b",
            maxWidth: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>Thoughts, stories</span>
          <span>
            &amp;{" "}
            <span style={{ fontStyle: "italic", color: "#3f3aa1" }}>
              random musings
            </span>
          </span>
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 22,
            color: "#7d756d",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          d-island-girl.com
        </div>
      </div>
    ),
    { ...size },
  );
}
