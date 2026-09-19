import type { DirectorySource } from "@/lib/directory/source";
import { snapshotDirectory } from "@/lib/directory/snapshot";
import { supabaseDirectory } from "@/lib/directory/supabase";
import { hasSupabaseConfig } from "@/lib/supabase";
import { SERVICE_TAGS, type ServiceTag } from "@/lib/types";

/**
 * Public pages use the checked-in launch snapshot until Supabase is configured.
 * Once configured, the same routes read the latest approved provider rows.
 */
export const directory: DirectorySource = hasSupabaseConfig ? supabaseDirectory : snapshotDirectory;

export async function getDirectoryStats() {
  const source = await directory.listLocations();
  return {
    locations: source.length,
    companies: new Set(source.map((location) => location.company)).size,
    counties: new Set(source.map((location) => location.county)).size,
    active: source.filter((location) => location.status_class === "active").length
  };
}

export async function getDirectoryTagCounts(activeOnly = true) {
  const source = await directory.listLocations();
  const counts = new Map<ServiceTag, number>(SERVICE_TAGS.map((tag) => [tag, 0]));
  source.filter((location) => !activeOnly || location.status_class === "active").forEach((location) => location.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  return counts;
}

export async function getDirectoryTopCounties(limit = 8) {
  const source = await directory.listLocations();
  const counts = new Map<string, number>();
  source.filter((location) => location.status_class === "active").forEach((location) => counts.set(location.county, (counts.get(location.county) ?? 0) + 1));
  return [...counts.entries()].map(([county, count]) => ({ county, count })).sort((a, b) => b.count - a.count || a.county.localeCompare(b.county)).slice(0, limit);
}
