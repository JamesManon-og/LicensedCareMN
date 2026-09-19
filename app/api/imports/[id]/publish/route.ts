import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { publishImportBatch } from "@/lib/imports";
import { hasSupabaseConfig, isAdmin } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig || !(await isAdmin())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  // The number of retirements the admin confirmed in the preview. A request without one confirms
  // none, so it can only publish a file that retires nothing.
  const body = await request.json().catch(() => ({}));
  const confirmed = Number.isSafeInteger(body?.retirements) && body.retirements >= 0 ? body.retirements : 0;
  const outcome = await publishImportBatch(id, confirmed);
  if (outcome.status === "unconfirmed") {
    return NextResponse.json({ error: `Publishing would retire ${outcome.retirements} listing(s), but ${confirmed} were confirmed. The directory may have changed since this preview; validate the file again to see the current changes.` }, { status: 409 });
  }
  if (outcome.status === "failed") return NextResponse.json({ error: "The import could not be published. The prior public directory remains unchanged; upload a corrected CSV to try again." }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/providers/[slug]", "page");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
}
