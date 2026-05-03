/**
 * Dynamic sitemap.xml — generated from Notion at request time.
 * Next.js handles XML generation; we just return the URL list.
 */

import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.d-island-girl.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/writings`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const articleEntries: MetadataRoute.Sitemap = posts.map((p) => {
    const date = p.isoDate ? new Date(`${p.isoDate}T00:00:00Z`) : new Date();
    return {
      url: `${SITE_URL}/writings/${p.slug}`,
      lastModified: isNaN(date.getTime()) ? new Date() : date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
  });

  return [...staticEntries, ...articleEntries];
}
