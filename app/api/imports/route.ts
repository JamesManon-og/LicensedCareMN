import { NextResponse } from "next/server";
import { parseNormalizedCsv } from "@/lib/csv";
import { getAdminSupabase, hasSupabaseConfig, isAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!hasSupabaseConfig || !(await isAdmin())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || !file.name.toLocaleLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Choose a CSV file to validate." }, { status: 400 });
  // The full 945-listing CSV is about 150 KB; this leaves ample room while bounding the parse.
  if (file.size > MAX_IMPORT_BYTES) return NextResponse.json({ error: "The CSV is larger than 4 MB. Split it or remove unused columns." }, { status: 413 });
  const preview = parseNormalizedCsv(await file.text());
  const client = getAdminSupabase();
  const path = `drafts/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error: uploadError } = await client.storage.from("imports").upload(path, file, { contentType: "text/csv", upsert: false });
  if (uploadError) return NextResponse.json({ error: "The source file could not be stored privately. Check the imports storage bucket." }, { status: 500 });
  const { data: batch, error: batchError } = await client.from("import_batches").insert({
    status: preview.issues.length ? "invalid" : "draft",
    source_filename: file.name,
    storage_path: path,
    total_rows: preview.totalRows,
    valid_rows: preview.records.length,
    issues: preview.issues,
    snapshot: preview.records
  }).select("id").single();
  if (batchError || !batch) return NextResponse.json({ error: "The import preview could not be saved." }, { status: 500 });
  return NextResponse.json({ id: batch.id, totalRows: preview.totalRows, validRows: preview.records.length, issues: preview.issues });
}
