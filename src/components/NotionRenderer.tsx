/**
 * NotionRenderer — renders a Notion block tree using the site's existing
 * editorial typography (Playfair serif body, accent indigo for emphasis).
 *
 * Supported blocks:
 *   - paragraph
 *   - heading_1 / heading_2 / heading_3
 *   - quote (rendered as the site's accent-bordered pull-quote)
 *   - bulleted_list_item / numbered_list_item (auto-grouped into <ul>/<ol>)
 *   - image
 *   - divider
 *   - callout
 *   - code
 *
 * Unsupported blocks (toggle, table, embed, video, etc.) render as a
 * subtle "Unsupported block: <type>" notice in dev, nothing in prod.
 *
 * Rich text supports bold, italic, underline, strikethrough, code, and links.
 * All matches the original `**bold**` parser the markdown version had,
 * plus everything else Notion authors expect to work.
 */

import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type { NotionBlock } from "@/lib/notion";

type BlockWithChildren = BlockObjectResponse & { __children?: NotionBlock[] };

export function NotionRenderer({ blocks }: { blocks: NotionBlock[] }) {
  return (
    <div className="max-w-[62ch] text-[1.05rem] font-light leading-[1.85] text-ink">
      {renderBlocks(blocks)}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Block list rendering — groups consecutive list items into <ul>/<ol>
// ─────────────────────────────────────────────────

function renderBlocks(blocks: NotionBlock[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let listBuffer: BlockWithChildren[] = [];
  let listType: "bulleted" | "numbered" | null = null;

  const renderListItem = (b: BlockWithChildren) => {
    const richText =
      b.type === "bulleted_list_item"
        ? b.bulleted_list_item.rich_text
        : b.type === "numbered_list_item"
          ? b.numbered_list_item.rich_text
          : [];
    return (
      <li key={b.id}>
        {renderRichText(richText)}
        {b.__children?.length ? (
          <div className="mt-2">{renderBlocks(b.__children)}</div>
        ) : null}
      </li>
    );
  };

  const flushList = () => {
    if (!listBuffer.length || !listType) return;
    const items = listBuffer.map(renderListItem);
    out.push(
      listType === "bulleted" ? (
        <ul
          key={`ul-${listBuffer[0].id}`}
          className="mb-6 ml-5 list-disc space-y-2"
        >
          {items}
        </ul>
      ) : (
        <ol
          key={`ol-${listBuffer[0].id}`}
          className="mb-6 ml-5 list-decimal space-y-2"
        >
          {items}
        </ol>
      ),
    );
    listBuffer = [];
    listType = null;
  };

  for (const block of blocks) {
    const b = block as BlockWithChildren;

    if (b.type === "bulleted_list_item") {
      if (listType !== "bulleted") flushList();
      listType = "bulleted";
      listBuffer.push(b);
      continue;
    }
    if (b.type === "numbered_list_item") {
      if (listType !== "numbered") flushList();
      listType = "numbered";
      listBuffer.push(b);
      continue;
    }

    flushList();
    out.push(renderBlock(b));
  }
  flushList();

  return out;
}

// ─────────────────────────────────────────────────
// Single block render
// ─────────────────────────────────────────────────

function renderBlock(block: BlockWithChildren): React.ReactNode {
  switch (block.type) {
    case "paragraph": {
      const rt = block.paragraph.rich_text;
      // Empty paragraphs preserve breathing space, like the original parser.
      if (rt.length === 0) return <p key={block.id} className="mb-6">&nbsp;</p>;
      return (
        <p key={block.id} className="mb-6">
          {renderRichText(rt)}
        </p>
      );
    }

    case "heading_1":
      return (
        <h2
          key={block.id}
          className="mb-4 mt-10 font-serif text-[1.7rem] font-medium leading-[1.2] tracking-[-0.02em] text-ink"
        >
          {renderRichText(block.heading_1.rich_text)}
        </h2>
      );

    case "heading_2":
      return (
        <h3
          key={block.id}
          className="mb-3 mt-8 font-serif text-[1.4rem] font-medium leading-[1.25] tracking-[-0.02em] text-ink"
        >
          {renderRichText(block.heading_2.rich_text)}
        </h3>
      );

    case "heading_3":
      return (
        <h4
          key={block.id}
          className="mb-2 mt-6 font-serif text-[1.15rem] font-medium leading-[1.3] text-ink"
        >
          {renderRichText(block.heading_3.rich_text)}
        </h4>
      );

    case "quote":
      return (
        <blockquote
          key={block.id}
          className="my-8 border-l-[3px] border-accent pl-5 font-serif text-[1.1rem] italic leading-[1.65] text-ink-mid"
        >
          {renderRichText(block.quote.rich_text)}
          {block.__children?.length ? (
            <div className="mt-3 text-[0.95rem]">
              {renderBlocks(block.__children)}
            </div>
          ) : null}
        </blockquote>
      );

    case "callout":
      return (
        <div
          key={block.id}
          className="my-6 flex gap-3 rounded-[6px] border border-rule bg-card px-5 py-4"
        >
          <div className="text-[1.1rem] leading-[1.5]">
            {block.callout.icon?.type === "emoji" ? block.callout.icon.emoji : "✦"}
          </div>
          <div className="flex-1 text-[0.98rem] text-ink-mid">
            {renderRichText(block.callout.rich_text)}
            {block.__children?.length ? (
              <div className="mt-2">{renderBlocks(block.__children)}</div>
            ) : null}
          </div>
        </div>
      );

    case "image": {
      const url =
        block.image.type === "external"
          ? block.image.external.url
          : block.image.file.url;
      const caption = block.image.caption
        .map((t) => t.plain_text)
        .join("")
        .trim();
      return (
        <figure key={block.id} className="my-10">
          <div className="relative w-full overflow-hidden rounded-[6px] border border-rule">
            {/* Notion-hosted images use signed URLs that expire (~1hr). For
                production-grade reliability, consider piping uploads through
                an image proxy or a CDN. For a personal blog with weekly
                publishing + ISR, signed-URL refresh-on-revalidate is fine. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption || ""}
              className="block h-auto w-full"
            />
          </div>
          {caption ? (
            <figcaption className="mt-3 text-center font-sans text-[0.8rem] italic text-ink-light">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    case "divider":
      return (
        <hr
          key={block.id}
          className="my-10 h-px border-0 bg-rule"
        />
      );

    case "code":
      return (
        <pre
          key={block.id}
          className="my-6 overflow-x-auto rounded-[6px] border border-rule bg-card px-4 py-3 font-mono text-[0.85rem] text-ink-mid"
        >
          <code>
            {block.code.rich_text.map((t) => t.plain_text).join("")}
          </code>
        </pre>
      );

    default:
      if (process.env.NODE_ENV === "development") {
        return (
          <div
            key={block.id}
            className="my-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-700"
          >
            Unsupported block type: <code>{block.type}</code>
          </div>
        );
      }
      return null;
  }
}

// Note: we use a plain <img> rather than next/image for Notion-hosted images
// because Notion serves them via signed URLs that expire ~1hr. Optimizing
// through next/image would require a custom loader. Revisit if image perf
// becomes a concern.

// ─────────────────────────────────────────────────
// Rich text renderer
// ─────────────────────────────────────────────────

function renderRichText(rich: RichTextItemResponse[]): React.ReactNode {
  return rich.map((node, i) => {
    let content: React.ReactNode = node.plain_text;
    const a = node.annotations;

    if (a.code) content = <code className="rounded bg-cream-dark px-1 py-0.5 font-mono text-[0.9em]">{content}</code>;
    if (a.bold) content = <strong className="font-medium text-ink">{content}</strong>;
    if (a.italic) content = <em>{content}</em>;
    if (a.underline) content = <u>{content}</u>;
    if (a.strikethrough) content = <s>{content}</s>;

    if (node.href) {
      content = (
        <a
          href={node.href}
          target={node.href.startsWith("http") ? "_blank" : undefined}
          rel={node.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors hover:decoration-accent"
        >
          {content}
        </a>
      );
    }

    return <span key={i}>{content}</span>;
  });
}
