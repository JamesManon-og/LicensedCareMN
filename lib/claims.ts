import { getAdminSupabase } from "@/lib/supabase";

export type ClaimDecision = "approved" | "rejected" | "revoked";

// The status a claim must have for each decision: a pending claim is approved or rejected, and an
// approved claim can later be revoked.
const DECIDED_FROM: Record<ClaimDecision, string> = { approved: "pending", rejected: "pending", revoked: "approved" };

/**
 * Records an administrator's decision on a claim and returns the claim's license number. Returns
 * null when no claim was in the state the decision applies to (already decided, or not found), so
 * a repeated click never reports a change that did not happen; throws when the update fails.
 */
export async function decideClaim(id: string, decision: ClaimDecision) {
  const { data, error } = await getAdminSupabase()
    .from("provider_claims")
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", DECIDED_FROM[decision])
    .select("license_number");
  if (error) throw new Error(`Claim decision failed: ${error.message}`);
  return (data[0]?.license_number as string | undefined) ?? null;
}
