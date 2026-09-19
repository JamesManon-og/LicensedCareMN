import { z } from "zod";
import type { Actor } from "@/lib/auth";
import { directory } from "@/lib/directory";
import { HttpError } from "@/lib/http";
import { hasApprovedClaim } from "@/lib/owner-content";
import { isHttpUrl, normalizeEmail } from "@/lib/owner-input";
import { getAdminSupabase } from "@/lib/supabase";

export const ownerProfileSchema = z.object({
  licenseNumber: z.string().min(1),
  description: z.string().trim().max(1200).optional(),
  website: z.union([z.literal(""), z.string().max(400).refine(isHttpUrl)]).optional(),
  contactEmail: z.union([z.literal(""), z.string().email().max(255)]).optional(),
  contactPhone: z.string().trim().max(60).optional()
});

export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;

/**
 * Saves the provider-supplied content of a listing the user holds an approved claim on, and returns
 * the slug of its profile (null when the listing is no longer current) so the page can be refreshed.
 */
export async function saveOwnerProfile(user: Actor, input: OwnerProfileInput) {
  if (!(await hasApprovedClaim(input.licenseNumber, user.email))) throw new HttpError(403, "You are not approved to manage this listing.");
  // Looked up before saving so a lookup failure cannot follow a save that succeeded.
  const provider = await directory.getByLicense(input.licenseNumber);
  const { error } = await getAdminSupabase().from("provider_profiles").upsert({
    license_number: input.licenseNumber,
    description: input.description || null,
    website: input.website || null,
    contact_email: input.contactEmail || null,
    contact_phone: input.contactPhone || null,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  }, { onConflict: "license_number" });
  if (error) {
    console.error(`Owner profile save failed: ${error.message}`);
    throw new HttpError(500, "The profile could not be saved.");
  }
  return provider?.slug ?? null;
}

/**
 * The current listings the user holds an approved claim on, each with its saved provider content.
 * A listing claimed (and approved) more than once is listed once.
 */
export async function getOwnerListings(user: Actor) {
  const client = getAdminSupabase();
  const { data: claims } = await client.from("provider_claims").select("license_number").eq("claimant_email", normalizeEmail(user.email)).eq("status", "approved");
  const licenses = [...new Set(claims?.map((claim) => claim.license_number as string) ?? [])];
  if (!licenses.length) return [];
  const [providers, { data: profiles }] = await Promise.all([
    directory.getByLicenses(licenses),
    client.from("provider_profiles").select("license_number, description, website, contact_email, contact_phone").in("license_number", licenses)
  ]);
  const providersByLicense = new Map(providers.map((provider) => [provider.license_number, provider]));
  const profilesByLicense = new Map((profiles ?? []).map((profile) => [profile.license_number as string, profile]));
  return licenses.flatMap((license) => {
    const provider = providersByLicense.get(license);
    return provider ? [{ provider, profile: profilesByLicense.get(license) ?? null }] : [];
  });
}
