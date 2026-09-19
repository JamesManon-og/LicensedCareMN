import { SERVICE_TAGS, type ProviderLocation, type ServiceTag } from "@/lib/types";

const TOP_COUNTY_LIMIT = 8;

/**
 * The home page's figures from one read of the directory: totals over every current listing, and
 * service-type and county counts over the active ones.
 */
export function summarizeDirectory(locations: ProviderLocation[]) {
  const active = locations.filter((location) => location.status_class === "active");

  const tagCounts = new Map<ServiceTag, number>(SERVICE_TAGS.map((tag) => [tag, 0]));
  active.forEach((location) => location.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)));

  const countyCounts = new Map<string, number>();
  active.forEach((location) => countyCounts.set(location.county, (countyCounts.get(location.county) ?? 0) + 1));
  const topCounties = [...countyCounts.entries()]
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count || a.county.localeCompare(b.county))
    .slice(0, TOP_COUNTY_LIMIT);

  return {
    stats: {
      locations: locations.length,
      companies: new Set(locations.map((location) => location.company)).size,
      counties: new Set(locations.map((location) => location.county)).size,
      active: active.length
    },
    tagCounts,
    topCounties
  };
}
