import rawLocations from "@/data/locations.json";
import {
  SERVICE_TAGS,
  type ProviderLocation,
  type SearchFilters,
  type SearchResult,
  type ServiceTag,
  type StatusClass
} from "@/lib/types";
import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

const locations = rawLocations as ProviderLocation[];

export const PAGE_SIZE = 24;
export const STATUS_LABEL: Record<StatusClass, string> = {
  active: "Active license",
  caution: "Conditional / provisional",
  critical: "Not currently licensed"
};

export const STATUS_EXPLANATION: Record<StatusClass, string> = {
  active: "The launch dataset lists this license as active.",
  caution: "The launch dataset lists a conditional or provisional status.",
  critical: "The launch dataset does not list this license as currently active."
};

export function getAllLocations() {
  return locations;
}

export function getProvider(slug: string) {
  return locations.find((location) => location.slug === slug);
}

export function getRelatedProviders(location: ProviderLocation, limit = 3) {
  return locations
    .filter(
      (candidate) =>
        candidate.slug !== location.slug &&
        (candidate.company === location.company || candidate.county === location.county) &&
        candidate.status_class === "active"
    )
    .sort((a, b) => Number(b.company === location.company) - Number(a.company === location.company))
    .slice(0, limit);
}

export function getStaticDirectoryStats() {
  const active = locations.filter((location) => location.status_class === "active").length;
  return {
    locations: locations.length,
    companies: new Set(locations.map((location) => location.company)).size,
    counties: new Set(locations.map((location) => location.county)).size,
    active
  };
}

export function getCounties() {
  return [...new Set(locations.map((location) => location.county))].sort((a, b) => a.localeCompare(b));
}

export function getTagCounts(activeOnly = true) {
  const counts = new Map<ServiceTag, number>(SERVICE_TAGS.map((tag) => [tag, 0]));
  locations
    .filter((location) => !activeOnly || location.status_class === "active")
    .forEach((location) => location.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  return counts;
}

export function getTopCounties(limit = 8) {
  const counts = new Map<string, number>();
  locations
    .filter((location) => location.status_class === "active")
    .forEach((location) => counts.set(location.county, (counts.get(location.county) ?? 0) + 1));
  return [...counts.entries()]
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count || a.county.localeCompare(b.county))
    .slice(0, limit);
}

function includesSearchText(location: ProviderLocation, query: string) {
  if (!query) return true;
  const haystack = [location.program_name, location.company, location.city, location.county]
    .join(" ")
    .toLocaleLowerCase();
  return query
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/** Clamps a requested page into [1, totalPages]; an empty result still has one (empty) page. */
export function paginate(requestedPage: number, total: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, totalPages, offset: (page - 1) * pageSize };
}

export function searchLocations(filters: SearchFilters): SearchResult {
  const filtered = locations.filter((location) => {
    if (filters.status === "active" && location.status_class !== "active") return false;
    if (filters.county && location.county !== filters.county) return false;
    if (filters.tags.length && !location.tags.some((tag) => filters.tags.includes(tag))) return false;
    return includesSearchText(location, filters.query);
  });

  const total = filtered.length;
  const { page, totalPages, offset } = paginate(filters.page, total);

  return { items: filtered.slice(offset, offset + PAGE_SIZE), total, page, totalPages, pageSize: PAGE_SIZE };
}

const PROVIDER_COLUMNS = "id, slug, program_name, company, tier, address, city, county, zip, phone, license_status, status_class, license_number, tags, primary_tag";

function mapDatabaseLocation(row: Record<string, unknown>): ProviderLocation {
  return {
    id: String(row.id ?? row.license_number),
    slug: String(row.slug),
    program_name: String(row.program_name),
    company: String(row.company),
    tier: String(row.tier),
    address: String(row.address),
    city: String(row.city),
    county: String(row.county),
    zip: String(row.zip),
    phone: typeof row.phone === "string" ? row.phone : null,
    license_status: String(row.license_status),
    status_class: row.status_class as StatusClass,
    license_number: String(row.license_number),
    tags: (row.tags as ServiceTag[]) ?? [],
    primary_tag: String(row.primary_tag) as ServiceTag
  };
}

/**
 * Public pages use the checked-in launch snapshot until Supabase is configured.
 * Once configured, the same routes read the latest approved provider rows.
 */
export async function getDirectoryLocations() {
  if (!hasSupabaseConfig) return locations;
  const client = getAdminSupabase();
  const { data, error } = await client
    .from("provider_locations")
    .select(PROVIDER_COLUMNS)
    .eq("is_current", true)
    .order("program_name");
  if (error || !data?.length) return locations;
  return data.map((row) => mapDatabaseLocation(row));
}

/**
 * A current listing by slug. Once Supabase is configured it is the only source: a provider a
 * later import retired is a 404, not the stale snapshot record. A database error throws, so a
 * regenerating page keeps its last good version instead of becoming a 404.
 */
export async function getDirectoryProvider(slug: string) {
  if (!hasSupabaseConfig) return getProvider(slug);
  const { data, error } = await getAdminSupabase()
    .from("provider_locations")
    .select(PROVIDER_COLUMNS)
    .eq("slug", slug)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw new Error(`Provider lookup failed: ${error.message}`);
  return data ? mapDatabaseLocation(data) : null;
}

/** A current listing by license number: the listing a claim or owner edit refers to, including imported ones. */
export async function getDirectoryProviderByLicense(licenseNumber: string) {
  if (!hasSupabaseConfig) return locations.find((location) => location.license_number === licenseNumber) ?? null;
  const { data, error } = await getAdminSupabase()
    .from("provider_locations")
    .select(PROVIDER_COLUMNS)
    .eq("license_number", licenseNumber)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw new Error(`Provider lookup failed: ${error.message}`);
  return data ? mapDatabaseLocation(data) : null;
}

/** getRelatedProviders over the current listings, so a profile never links to a retired provider. */
export async function getDirectoryRelatedProviders(location: ProviderLocation, limit = 3) {
  if (!hasSupabaseConfig) return getRelatedProviders(location, limit);
  const sharing = (column: "company" | "county") =>
    getAdminSupabase()
      .from("provider_locations")
      .select(PROVIDER_COLUMNS)
      .eq(column, location[column])
      .eq("is_current", true)
      .eq("status_class", "active")
      .neq("slug", location.slug)
      .order("program_name")
      .limit(limit);
  const [sameCompany, sameCounty] = await Promise.all([sharing("company"), sharing("county")]);
  // Related providers are optional; the profile still renders without them.
  if (sameCompany.error || sameCounty.error) {
    console.error(`Related providers failed: ${(sameCompany.error ?? sameCounty.error)?.message}`);
    return [];
  }
  const rows = [...sameCompany.data, ...sameCounty.data];
  return rows
    .filter((row, index) => rows.findIndex((other) => other.slug === row.slug) === index)
    .slice(0, limit)
    .map((row) => mapDatabaseLocation(row));
}

/** Counties with a current listing: the county filter's options and the values parseSearchFilters accepts. */
export async function getDirectoryCounties() {
  if (!hasSupabaseConfig) return getCounties();
  const { data, error } = await getAdminSupabase().rpc("directory_counties");
  if (error) throw new Error(`County lookup failed: ${error.message}`);
  return ((data ?? []) as { county: string }[]).map((row) => row.county);
}

export async function getDirectoryStats() {
  const source = await getDirectoryLocations();
  return {
    locations: source.length,
    companies: new Set(source.map((location) => location.company)).size,
    counties: new Set(source.map((location) => location.county)).size,
    active: source.filter((location) => location.status_class === "active").length
  };
}

export async function getDirectoryTagCounts(activeOnly = true) {
  const source = await getDirectoryLocations();
  const counts = new Map<ServiceTag, number>(SERVICE_TAGS.map((tag) => [tag, 0]));
  source.filter((location) => !activeOnly || location.status_class === "active").forEach((location) => location.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  return counts;
}

export async function getDirectoryTopCounties(limit = 8) {
  const source = await getDirectoryLocations();
  const counts = new Map<string, number>();
  source.filter((location) => location.status_class === "active").forEach((location) => counts.set(location.county, (counts.get(location.county) ?? 0) + 1));
  return [...counts.entries()].map(([county, count]) => ({ county, count })).sort((a, b) => b.count - a.count || a.county.localeCompare(b.county)).slice(0, limit);
}

/**
 * Ranked, typo-tolerant search through the search_directory RPC (supabase/migrations/0002_search.sql).
 * The RPC clamps an out-of-range offset to the last page, so paginate() reports the page its rows
 * came from. An empty result is a real "no matches"; the snapshot is only used when Supabase is not
 * configured, never to paper over a database error.
 */
export async function searchDirectory(filters: SearchFilters): Promise<SearchResult> {
  if (!hasSupabaseConfig) return searchLocations(filters);
  const { data, error } = await getAdminSupabase().rpc("search_directory", {
    p_query: filters.query,
    p_county: filters.county,
    p_tags: filters.tags,
    p_status: filters.status,
    p_limit: PAGE_SIZE,
    p_offset: (Math.max(filters.page, 1) - 1) * PAGE_SIZE
  });
  if (error) throw new Error(`Directory search failed: ${error.message}`);
  const rows = (data ?? []) as Record<string, unknown>[];
  const total = Number(rows[0]?.total_count ?? 0);
  const { page, totalPages } = paginate(filters.page, total);
  return { items: rows.map((row) => mapDatabaseLocation(row)), total, page, totalPages, pageSize: PAGE_SIZE };
}

/** "Did you mean" queries for a search with no results; each one matches at least one provider under the same filters. */
export async function suggestDirectoryQueries(filters: SearchFilters): Promise<string[]> {
  if (!hasSupabaseConfig || !filters.query.trim()) return [];
  const { data, error } = await getAdminSupabase().rpc("suggest_directory_queries", {
    p_query: filters.query,
    p_county: filters.county,
    p_tags: filters.tags,
    p_status: filters.status,
    p_limit: 3
  });
  // Suggestions are optional; the empty state still renders without them.
  if (error) {
    console.error(`Directory suggestions failed: ${error.message}`);
    return [];
  }
  return ((data ?? []) as { suggestion: string }[]).map((row) => row.suggestion);
}

// Pages past the last one are clamped to it after searching; this cap only keeps the database
// offset ((page - 1) * PAGE_SIZE) far inside Postgres's integer range.
export const MAX_PAGE = 10_000;

export function isServiceTag(value: string): value is ServiceTag {
  return (SERVICE_TAGS as readonly string[]).includes(value);
}

/** `counties` are the accepted county values; pass getDirectoryCounties() when Supabase is the source. */
export function parseSearchFilters(input: Record<string, string | string[] | undefined>, counties: readonly string[] = getCounties()): SearchFilters {
  const rawTags = input.tag;
  const tags = (Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : []).filter(isServiceTag);
  const county = typeof input.county === "string" && counties.includes(input.county) ? input.county : "";
  const query = typeof input.q === "string" ? input.q.slice(0, 120) : "";
  const status = input.status === "all" ? "all" : "active";
  const requestedPage = typeof input.page === "string" ? Number.parseInt(input.page, 10) : 1;

  return {
    query,
    county,
    tags,
    status,
    page: Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), MAX_PAGE) : 1
  };
}

export function formatPhone(phone: string | null) {
  return phone?.trim() || "Phone not listed";
}
