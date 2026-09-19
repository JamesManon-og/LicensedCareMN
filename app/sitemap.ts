import type { MetadataRoute } from "next";
import { directory } from "@/lib/directory";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const locations = await directory.listLocations();
  return ["", "/search", "/guide", "/faq"].map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly" as const, priority: path ? 0.7 : 1 })).concat(locations.map((location) => ({ url: `${base}/providers/${location.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })));
}
