import { isHttpUrl } from "@/lib/owner-input";
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
