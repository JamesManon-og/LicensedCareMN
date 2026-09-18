import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { publishImportBatch } from "@/lib/imports";
import { hasSupabaseConfig, isAdmin } from "@/lib/supabase";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig || !(await isAdmin())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  const error = await publishImportBatch(id);
  if (error) return NextResponse.json({ error: "The import could not be published. The prior public directory remains unchanged; upload a corrected CSV to try again." }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/providers/[slug]", "page");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
}
