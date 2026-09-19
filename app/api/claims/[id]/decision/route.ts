import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { decideClaim } from "@/lib/claims";
import { directory } from "@/lib/directory";
import { isAdmin } from "@/lib/supabase";

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected", "revoked"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose approve, reject, or revoke." }, { status: 400 });
  const { id } = await params;
  const licenseNumber = await decideClaim(id, body.data.decision).catch(() => undefined);
  if (licenseNumber === undefined) return NextResponse.json({ error: "The claim could not be updated." }, { status: 500 });
  if (licenseNumber === null) return NextResponse.json({ error: "This claim has already been decided. Reload to see its current status." }, { status: 409 });
  // The profile shows the listing's claimed badge and, while approved, its provider content.
  const provider = await directory.getByLicense(licenseNumber).catch(() => null);
  if (provider) revalidatePath(`/providers/${provider.slug}`);
  return NextResponse.json({ ok: true });
}
