import rawLocations from "@/locations.json";
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

export function searchLocations(filters: SearchFilters): SearchResult {
  const filtered = locations.filter((location) => {
    if (filters.status === "active" && location.status_class !== "active") return false;
    if (filters.county && location.county !== filters.county) return false;
    if (filters.tags.length && !location.tags.some((tag) => filters.tags.includes(tag))) return false;
    return includesSearchText(location, filters.query);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return { items: filtered.slice(start, start + PAGE_SIZE), total, page, totalPages, pageSize: PAGE_SIZE };
}

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
    .select("id, slug, program_name, company, tier, address, city, county, zip, phone, license_status, status_class, license_number, tags, primary_tag")
    .eq("is_current", true)
    .order("program_name");
  if (error || !data?.length) return locations;
  return data.map((row) => mapDatabaseLocation(row));
}

export async function getDirectoryProvider(slug: string) {
  if (!hasSupabaseConfig) return getProvider(slug);
  const client = getAdminSupabase();
  const { data } = await client
    .from("provider_locations")
    .select("id, slug, program_name, company, tier, address, city, county, zip, phone, license_status, status_class, license_number, tags, primary_tag")
    .eq("slug", slug)
    .eq("is_current", true)
    .maybeSingle();
  return data ? mapDatabaseLocation(data) : getProvider(slug);
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

export async function searchDirectory(filters: SearchFilters): Promise<SearchResult> {
  if (!hasSupabaseConfig) return searchLocations(filters);
  const client = getAdminSupabase();
  let request = client
    .from("provider_locations")
    .select("id, slug, program_name, company, tier, address, city, county, zip, phone, license_status, status_class, license_number, tags, primary_tag", { count: "exact" })
    .eq("is_current", true)
    .order("program_name");
  if (filters.status === "active") request = request.eq("status_class", "active");
  if (filters.county) request = request.eq("county", filters.county);
  if (filters.tags.length) request = request.overlaps("tags", filters.tags);
  if (filters.query) {
    const term = filters.query.replace(/[,%().]/g, " ").trim();
    if (term) request = request.or(`program_name.ilike.%${term}%,company.ilike.%${term}%,city.ilike.%${term}%,county.ilike.%${term}%`);
  }
  const start = Math.max(filters.page - 1, 0) * PAGE_SIZE;
  const { data, count, error } = await request.range(start, start + PAGE_SIZE - 1);
  if (error || !data) return searchLocations(filters);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { items: data.map((row) => mapDatabaseLocation(row)), total, page: Math.min(filters.page, totalPages), totalPages, pageSize: PAGE_SIZE };
}

export function isServiceTag(value: string): value is ServiceTag {
  return (SERVICE_TAGS as readonly string[]).includes(value);
}

export function parseSearchFilters(input: Record<string, string | string[] | undefined>): SearchFilters {
  const rawTags = input.tag;
  const tags = (Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : []).filter(isServiceTag);
  const county = typeof input.county === "string" && getCounties().includes(input.county) ? input.county : "";
  const query = typeof input.q === "string" ? input.q.slice(0, 120) : "";
  const status = input.status === "all" ? "all" : "active";
  const requestedPage = typeof input.page === "string" ? Number.parseInt(input.page, 10) : 1;

  return {
    query,
    county,
    tags,
    status,
    page: Number.isFinite(requestedPage) ? requestedPage : 1
  };
}

export function formatPhone(phone: string | null) {
  return phone?.trim() || "Phone not listed";
}
