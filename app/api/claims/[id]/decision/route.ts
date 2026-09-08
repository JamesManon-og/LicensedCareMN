import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase, isAdmin } from "@/lib/supabase";

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  const { id } = await params;
  const client = getAdminSupabase();
  const { error } = await client.from("provider_claims").update({ status: body.data.decision, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
  if (error) return NextResponse.json({ error: "The claim could not be updated." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
