import { NextResponse } from "next/server";
import { z } from "zod";
import { getDirectoryProviderByLicense } from "@/lib/locations";
import { normalizeEmail } from "@/lib/owner-input";
import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

const claimSchema = z.object({
  licenseNumber: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  role: z.string().trim().min(2).max(180),
  phone: z.string().trim().max(60).optional(),
  message: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional()
});

export async function POST(request: Request) {
  const data = claimSchema.safeParse(await request.json().catch(() => null));
  if (!data.success) return NextResponse.json({ error: "Please provide a valid name, work email, and relationship to the provider." }, { status: 400 });
  if (!(await getDirectoryProviderByLicense(data.data.licenseNumber))) return NextResponse.json({ error: "That listing was not found in this directory." }, { status: 404 });
  if (!hasSupabaseConfig) return NextResponse.json({ error: "Claims are not configured for this deployment yet." }, { status: 503 });
  const client = getAdminSupabase();
  const { error } = await client.from("provider_claims").insert({
    license_number: data.data.licenseNumber,
    claimant_name: data.data.name,
    claimant_email: normalizeEmail(data.data.email),
    claimant_role: data.data.role,
    claimant_phone: data.data.phone || null,
    message: data.data.message || null,
    status: "pending"
  });
  if (error) return NextResponse.json({ error: "The request could not be saved. Please try again later." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
