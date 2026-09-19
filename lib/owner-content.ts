import { isHttpUrl, normalizeEmail } from "@/lib/owner-input";
import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

export type OwnerContent = { description: string | null; website: string | null; contact_email: string | null; contact_phone: string | null };

/**
 * A profile page's claim data in one claims query: which of the featured listing and its related
 * listings are claimed, and the featured listing's provider-supplied content. That content is public
 * only while the listing has an approved claim, so moving the claim out of `approved` takes the
 * content down with it. Both are secondary; the page still renders without them.
 */
export async function getListingClaims(
  featured: string,
  others: string[]
): Promise<{ claimed: Set<string>; ownerContent: OwnerContent | null }> {
  if (!hasSupabaseConfig) return { claimed: new Set(), ownerContent: null };
  const client = getAdminSupabase();
  const [claims, profile] = await Promise.all([
    client.from("provider_claims").select("license_number").in("license_number", [featured, ...others]).eq("status", "approved"),
    client
      .from("provider_profiles")
      .select("description, website, contact_email, contact_phone")
      .eq("license_number", featured)
      .maybeSingle()
  ]);
  if (claims.error) {
    console.error(`Claimed listings lookup failed: ${claims.error.message}`);
    return { claimed: new Set(), ownerContent: null };
  }
  if (profile.error) console.error(`Provider content lookup failed: ${profile.error.message}`);
  const claimed = new Set(claims.data.map((row) => row.license_number as string));
  const content = claimed.has(featured) ? profile.data : null;
  // A website saved before the http(s) check may still hold a javascript: or data: URL.
  const ownerContent = content && { ...content, website: content.website && isHttpUrl(content.website) ? content.website : null };
  return { claimed, ownerContent };
}

/**
 * Whether this email holds an approved claim on the listing. Nothing stops the same person from
 * submitting (and an administrator approving) a claim twice, so this must not expect exactly one row.
 */
export async function hasApprovedClaim(licenseNumber: string, email: string) {
  const { data } = await getAdminSupabase()
    .from("provider_claims")
    .select("id")
    .eq("license_number", licenseNumber)
    .eq("claimant_email", normalizeEmail(email))
    .eq("status", "approved")
    .limit(1);
  return Boolean(data?.length);
}

/** The listings among `licenseNumbers` that have an approved claim, in one query for a page of search results. */
export async function getClaimedLicenses(licenseNumbers: string[]): Promise<Set<string>> {
  if (!hasSupabaseConfig || !licenseNumbers.length) return new Set();
  const { data, error } = await getAdminSupabase()
    .from("provider_claims")
    .select("license_number")
    .in("license_number", licenseNumbers)
    .eq("status", "approved");
  // The badge is secondary; the page still renders without it.
  if (error) {
    console.error(`Claimed listings lookup failed: ${error.message}`);
    return new Set();
  }
  return new Set(data.map((row) => row.license_number as string));
}
