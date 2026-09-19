import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { directory } from "@/lib/directory";
import { hasApprovedClaim } from "@/lib/owner-content";
import { isHttpUrl } from "@/lib/owner-input";
import { getAdminSupabase, getCurrentUser, hasSupabaseConfig } from "@/lib/supabase";

const profileSchema = z.object({
  licenseNumber: z.string().min(1),
  description: z.string().trim().max(1200).optional(),
  website: z.union([z.literal(""), z.string().max(400).refine(isHttpUrl)]).optional(),
  contactEmail: z.union([z.literal(""), z.string().email().max(255)]).optional(),
  contactPhone: z.string().trim().max(60).optional()
});

export async function PUT(request: Request) {
  if (!hasSupabaseConfig) return NextResponse.json({ error: "Owner tools are not configured for this deployment." }, { status: 503 });
  const user = await getCurrentUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in with the approved work email first." }, { status: 401 });
  const data = profileSchema.safeParse(await request.json().catch(() => null));
  if (!data.success) return NextResponse.json({ error: "Review the website, email, and content fields." }, { status: 400 });
  if (!(await hasApprovedClaim(data.data.licenseNumber, user.email))) return NextResponse.json({ error: "You are not approved to manage this listing." }, { status: 403 });
  // Looked up before saving so a lookup failure cannot follow a save that succeeded.
  const provider = await directory.getByLicense(data.data.licenseNumber);
  const { error } = await getAdminSupabase().from("provider_profiles").upsert({
    license_number: data.data.licenseNumber,
    description: data.data.description || null,
    website: data.data.website || null,
    contact_email: data.data.contactEmail || null,
    contact_phone: data.data.contactPhone || null,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  }, { onConflict: "license_number" });
  if (error) return NextResponse.json({ error: "The profile could not be saved." }, { status: 500 });
  if (provider) revalidatePath(`/providers/${provider.slug}`);
  return NextResponse.json({ ok: true });
}
