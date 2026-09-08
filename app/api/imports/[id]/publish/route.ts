import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSupabase, hasSupabaseConfig, isAdmin } from "@/lib/supabase";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig || !(await isAdmin())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  const client = getAdminSupabase();
  const { error } = await client.rpc("publish_import", { p_batch_id: id });
  if (error) return NextResponse.json({ error: "The import could not be published. The prior public directory remains unchanged." }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/providers/[slug]", "page");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
}
