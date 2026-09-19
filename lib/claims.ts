import { z } from "zod";
import type { AdminActor } from "@/lib/auth";
import { directory } from "@/lib/directory";
import { HttpError, parseId } from "@/lib/http";
import { normalizeEmail } from "@/lib/owner-input";
import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

export const claimSchema = z.object({
  licenseNumber: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  role: z.string().trim().min(2).max(180),
  phone: z.string().trim().max(60).optional(),
  message: z.string().trim().max(1000).optional(),
  // A field people never see: a bot that fills it in is refused.
  website: z.string().max(0).optional()
});

export type ClaimInput = z.infer<typeof claimSchema>;

/** Saves a public claim request for a current listing. Anyone may submit one, so there is no actor. */
export async function submitClaim(input: ClaimInput) {
  if (!(await directory.getByLicense(input.licenseNumber))) throw new HttpError(404, "That listing was not found in this directory.");
  if (!hasSupabaseConfig) throw new HttpError(503, "Claims are not configured for this deployment yet.");
  const { error } = await getAdminSupabase().from("provider_claims").insert({
    license_number: input.licenseNumber,
    claimant_name: input.name,
    claimant_email: normalizeEmail(input.email),
    claimant_role: input.role,
    claimant_phone: input.phone || null,
    message: input.message || null,
    status: "pending"
  });
  // 23505: this email already has a pending or approved claim on the listing (a repeated submit).
  if (error && error.code !== "23505") {
    console.error(`Claim submission failed: ${error.message}`);
    throw new HttpError(500, "The request could not be saved. Please try again later.");
  }
}

export type ClaimDecision = "approved" | "rejected" | "revoked";

// The status a claim must have for each decision: a pending claim is approved or rejected, and an
// approved claim can later be revoked.
const DECIDED_FROM: Record<ClaimDecision, string> = { approved: "pending", rejected: "pending", revoked: "approved" };

/**
 * Records an administrator's decision on a claim and returns the slug of the claimed listing's
 * profile (null when the listing is no longer current), whose claimed badge and provider content
 * the decision changes. A claim that is not in the state the decision applies to (already decided,
 * or not found) is a 409, so a repeated click never reports a change that did not happen.
 */
export async function decideClaim(_admin: AdminActor, id: string, decision: ClaimDecision) {
  const { data, error } = await getAdminSupabase()
    .from("provider_claims")
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq("id", parseId(id, "This claim was not found."))
    .eq("status", DECIDED_FROM[decision])
    .select("license_number");
  if (error) {
    console.error(`Claim decision failed: ${error.message}`);
    throw new HttpError(500, "The claim could not be updated.");
  }
  const licenseNumber = data[0]?.license_number as string | undefined;
  if (!licenseNumber) throw new HttpError(409, "This claim has already been decided. Reload to see its current status.");
  // The decision is saved; a failed lookup only means the profile page is not refreshed now.
  const provider = await directory.getByLicense(licenseNumber).catch(() => null);
  return provider?.slug ?? null;
}

/** Every claim request, newest first, for the review queue. */
export async function listClaims(_admin: AdminActor) {
  const { data, error } = await getAdminSupabase()
    .from("provider_claims")
    .select("id, license_number, claimant_name, claimant_email, claimant_role, claimant_phone, message, status, created_at")
    .order("created_at", { ascending: false });
  // An outage must not read as "there are no claim requests".
  if (error) throw new Error(`Claim queue lookup failed: ${error.message}`);
  return data;
}
