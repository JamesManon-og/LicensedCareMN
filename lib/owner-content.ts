import { isHttpUrl, normalizeEmail } from "@/lib/owner-input";
import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

export type OwnerContent = { description: string | null; website: string | null; contact_email: string | null; contact_phone: string | null };

/**
 * Provider-supplied content is public only while the listing has an approved claim, so moving
 * that claim out of `approved` takes the content down with it.
 */
export async function getOwnerContent(licenseNumber: string): Promise<OwnerContent | null> {
  if (!hasSupabaseConfig) return null;
  const client = getAdminSupabase();
  const [{ data: claims }, { data }] = await Promise.all([
    client.from("provider_claims").select("id").eq("license_number", licenseNumber).eq("status", "approved").limit(1),
    client
      .from("provider_profiles")
      .select("description, website, contact_email, contact_phone")
      .eq("license_number", licenseNumber)
      .maybeSingle()
  ]);
  if (!claims?.length || !data) return null;
  // A website saved before the http(s) check may still hold a javascript: or data: URL.
  return { ...data, website: data.website && isHttpUrl(data.website) ? data.website : null };
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

/** The listings among `licenseNumbers` that have an approved claim, in one query for a page of listings. */
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
