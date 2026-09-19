import type { ProviderLocation, SearchFilters, SearchResult } from "@/lib/types";

/**
 * Where the public directory reads its listings: the checked-in launch snapshot, or the current
 * rows in Supabase. Both implement the same contract (tests/directory.test.ts runs it against each).
 */
export type DirectorySource = {
  /** Every current listing. */
  listLocations(): Promise<ProviderLocation[]>;
  /** A current listing by slug, or null. */
  getBySlug(slug: string): Promise<ProviderLocation | null>;
  /** A current listing by license number: the listing a claim or owner edit refers to. */
  getByLicense(licenseNumber: string): Promise<ProviderLocation | null>;
  /** The current listings among these license numbers, in no particular order; unknown ones are left out. */
  getByLicenses(licenseNumbers: string[]): Promise<ProviderLocation[]>;
  /** Active listings sharing the location's company or county, the location itself excluded. */
  getRelated(location: ProviderLocation, limit?: number): Promise<ProviderLocation[]>;
  /** Counties with a current listing, sorted: the county filter's options and accepted values. */
  getCounties(): Promise<string[]>;
  /** One page of matching listings; an out-of-range page is clamped to the last one. */
  search(filters: SearchFilters): Promise<SearchResult>;
  /** "Did you mean" queries for a search with no results. */
  suggest(filters: SearchFilters): Promise<string[]>;
};
