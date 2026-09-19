import rawLocations from "@/data/locations.json";
import { PAGE_SIZE, paginate } from "@/lib/search-filters";
import type { ProviderLocation, SearchFilters, SearchResult } from "@/lib/types";
import type { DirectorySource } from "@/lib/directory/source";

/** The checked-in launch snapshot: static page params, the seed script, and the offline directory. */
export const snapshotLocations = rawLocations as ProviderLocation[];

/** A snapshot listing by slug, whether or not a later import retired it (the legacy .html redirects). */
export function findSnapshotProvider(slug: string) {
  return snapshotLocations.find((location) => location.slug === slug) ?? null;
}

// Mirrors search_directory (supabase/migrations/0005_search_aliases.sql) without the typo tolerance.
const SAINT_TERMS = new Set(["st", "st.", "saint"]);

function includesSearchText(location: ProviderLocation, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  if (/^\d{5,}(-\d{4})?$/.test(normalized) && (location.license_number === normalized || location.zip.trim().startsWith(normalized))) return true;
  const haystack = [location.program_name, location.company, location.city, location.county]
    .join(" ")
    .toLocaleLowerCase();
  return normalized
    .split(/\s+/)
    .every((term) => haystack.includes(term) || (SAINT_TERMS.has(term) && /\b(st|saint)\b/.test(haystack)));
}

function searchSnapshot(filters: SearchFilters): SearchResult {
  const filtered = snapshotLocations.filter((location) => {
    if (filters.status === "active" && location.status_class !== "active") return false;
    if (filters.county && location.county !== filters.county) return false;
    if (filters.tags.length && !location.tags.some((tag) => filters.tags.includes(tag))) return false;
    return includesSearchText(location, filters.query);
  });

  const total = filtered.length;
  const { page, totalPages, offset } = paginate(filters.page, total);

  return { items: filtered.slice(offset, offset + PAGE_SIZE), total, page, totalPages, pageSize: PAGE_SIZE };
}

/** The directory when Supabase is not configured: every snapshot listing counts as current. */
export const snapshotDirectory: DirectorySource = {
  async listLocations() {
    return snapshotLocations;
  },
  async getBySlug(slug) {
    return findSnapshotProvider(slug);
  },
  async getByLicense(licenseNumber) {
    return snapshotLocations.find((location) => location.license_number === licenseNumber) ?? null;
  },
  async getByLicenses(licenseNumbers) {
    return snapshotLocations.filter((location) => licenseNumbers.includes(location.license_number));
  },
  async getRelated(location, limit = 3) {
    return snapshotLocations
      .filter(
        (candidate) =>
          candidate.slug !== location.slug &&
          (candidate.company === location.company || candidate.county === location.county) &&
          candidate.status_class === "active"
      )
      .sort((a, b) => Number(b.company === location.company) - Number(a.company === location.company))
      .slice(0, limit);
  },
  async getCounties() {
    return [...new Set(snapshotLocations.map((location) => location.county))].sort((a, b) => a.localeCompare(b));
  },
  async search(filters) {
    return searchSnapshot(filters);
  },
  // Suggestions need the database's typo matching; the snapshot's empty state goes without them.
  async suggest() {
    return [];
  }
};
