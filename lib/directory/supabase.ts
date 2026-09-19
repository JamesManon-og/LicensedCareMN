import { PAGE_SIZE, paginate } from "@/lib/search-filters";
import { getAdminSupabase } from "@/lib/supabase";
import type { ProviderLocation, ServiceTag, StatusClass } from "@/lib/types";
import type { DirectorySource } from "@/lib/directory/source";

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

const LISTING_PAGE_SIZE = 1000;

/**
 * The latest approved provider rows. Required reads throw on a database error, so a regenerating
 * page keeps its last good version instead of showing the launch snapshot or becoming a 404;
 * related providers and suggestions are optional and come back empty instead.
 */
export const supabaseDirectory: DirectorySource = {
  async listLocations() {
    const client = getAdminSupabase();
    const rows: Record<string, unknown>[] = [];
    // The Data API returns at most 1,000 rows per request, so read the listings a page at a time.
    for (let from = 0; ; from += LISTING_PAGE_SIZE) {
      const { data, error } = await client
        .from("provider_locations")
        .select(PROVIDER_COLUMNS)
        .eq("is_current", true)
        .order("program_name")
        .order("license_number")
        .range(from, from + LISTING_PAGE_SIZE - 1);
      if (error) throw new Error(`Directory listing failed: ${error.message}`);
      rows.push(...data);
      if (data.length < LISTING_PAGE_SIZE) break;
    }
    return rows.map((row) => mapDatabaseLocation(row));
  },

  // A provider a later import retired is a 404, not the stale snapshot record.
  async getBySlug(slug) {
    const { data, error } = await getAdminSupabase()
      .from("provider_locations")
      .select(PROVIDER_COLUMNS)
      .eq("slug", slug)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw new Error(`Provider lookup failed: ${error.message}`);
    return data ? mapDatabaseLocation(data) : null;
  },

  async getByLicense(licenseNumber) {
    const { data, error } = await getAdminSupabase()
      .from("provider_locations")
      .select(PROVIDER_COLUMNS)
      .eq("license_number", licenseNumber)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw new Error(`Provider lookup failed: ${error.message}`);
    return data ? mapDatabaseLocation(data) : null;
  },

  async getByLicenses(licenseNumbers) {
    if (!licenseNumbers.length) return [];
    const { data, error } = await getAdminSupabase()
      .from("provider_locations")
      .select(PROVIDER_COLUMNS)
      .in("license_number", licenseNumbers)
      .eq("is_current", true);
    if (error) throw new Error(`Provider lookup failed: ${error.message}`);
    return data.map((row) => mapDatabaseLocation(row));
  },

  async getRelated(location, limit = 3) {
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
  },

  async getCounties() {
    const { data, error } = await getAdminSupabase().rpc("directory_counties");
    if (error) throw new Error(`County lookup failed: ${error.message}`);
    return ((data ?? []) as { county: string }[]).map((row) => row.county);
  },

  /**
   * Ranked, typo-tolerant search through the search_directory RPC (supabase/migrations/0002_search.sql).
   * The RPC clamps an out-of-range offset to the last page, so paginate() reports the page its rows
   * came from. An empty result is a real "no matches".
   */
  async search(filters) {
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
  },

  // Each suggestion matches at least one provider under the same filters.
  async suggest(filters) {
    if (!filters.query.trim()) return [];
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
};
