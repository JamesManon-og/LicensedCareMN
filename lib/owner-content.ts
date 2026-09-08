import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

export type OwnerContent = { description: string | null; website: string | null; contact_email: string | null; contact_phone: string | null };

export async function getOwnerContent(licenseNumber: string): Promise<OwnerContent | null> {
  if (!hasSupabaseConfig) return null;
  const client = getAdminSupabase();
  const { data } = await client
    .from("provider_profiles")
    .select("description, website, contact_email, contact_phone")
    .eq("license_number", licenseNumber)
    .maybeSingle();
  return data;
}
