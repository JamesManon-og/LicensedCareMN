import type { AdminActor } from "@/lib/auth";
import { parseNormalizedCsv } from "@/lib/csv";
import { directory } from "@/lib/directory";
import { HttpError, parseId } from "@/lib/http";
import { getAdminSupabase } from "@/lib/supabase";
import type { ProviderLocation } from "@/lib/types";

/** The listing fields publish_import writes besides tags (compared in order below); any difference makes the row an update. */
const PUBLISHED_FIELDS = ["slug", "program_name", "company", "tier", "address", "city", "county", "zip", "phone", "license_status", "status_class", "primary_tag"] as const;

export type RetiredListing = Pick<ProviderLocation, "license_number" | "program_name" | "city">;

export type ImportChanges = {
  added: number;
  updated: number;
  unchanged: number;
  retired: RetiredListing[];
};

function isSameListing(record: ProviderLocation, current: ProviderLocation) {
  return PUBLISHED_FIELDS.every((field) => (record[field] ?? null) === (current[field] ?? null))
    && record.tags.join("|") === current.tags.join("|");
}

/**
 * What publishing `records` would do to the current directory. Publishing retires every current
 * listing that is not in the file, so a partial file retires the rest of the directory; the admin
 * form shows these counts and the publish route requires the retirements to be confirmed.
 * A retired listing that is back in the file counts as added: it reappears in the directory.
 */
export function compareWithDirectory(records: ProviderLocation[], current: ProviderLocation[]): ImportChanges {
  const currentByLicense = new Map(current.map((location) => [location.license_number, location]));
  const incoming = new Set(records.map((record) => record.license_number));
  const changes: ImportChanges = { added: 0, updated: 0, unchanged: 0, retired: [] };
  records.forEach((record) => {
    const existing = currentByLicense.get(record.license_number);
    if (!existing) changes.added += 1;
    else if (isSameListing(record, existing)) changes.unchanged += 1;
    else changes.updated += 1;
  });
  changes.retired = current
    .filter((location) => !incoming.has(location.license_number))
    .map(({ license_number, program_name, city }) => ({ license_number, program_name, city }));
  return changes;
}

// The full 945-listing CSV is about 150 KB; this leaves ample room while bounding the parse.
const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

/**
 * Validates an uploaded CSV, compares a valid one with the current directory, and saves it as an
 * import batch: a draft that can be published, or an invalid batch kept as a record. The file is
 * stored privately first; if the batch then cannot be saved, the stored file is removed again.
 */
export async function createImportPreview(_admin: AdminActor, file: FormDataEntryValue | null | undefined) {
  if (!(file instanceof File) || !file.name.toLocaleLowerCase().endsWith(".csv")) throw new HttpError(400, "Choose a CSV file to validate.");
  if (file.size > MAX_IMPORT_BYTES) throw new HttpError(413, "The CSV is larger than 4 MB. Split it or remove unused columns.");
  const preview = parseNormalizedCsv(await file.text());
  // Only a valid file can be published, so only a valid file is compared with the directory. The
  // comparison runs before the upload so a failed read does not leave a stored file behind.
  let changes: ImportChanges | null = null;
  if (!preview.issues.length) {
    try {
      changes = compareWithDirectory(preview.records, await directory.listLocations());
    } catch (error) {
      console.error(error);
      throw new HttpError(500, "The current directory could not be read to compare with this file. Try again.");
    }
  }
  const client = getAdminSupabase();
  const path = `drafts/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error: uploadError } = await client.storage.from("imports").upload(path, file, { contentType: "text/csv", upsert: false });
  if (uploadError) {
    console.error(`Import upload failed: ${uploadError.message}`);
    throw new HttpError(500, "The source file could not be stored privately. Check the imports storage bucket.");
  }
  const { data: batch, error: batchError } = await client.from("import_batches").insert({
    status: preview.issues.length ? "invalid" : "draft",
    source_filename: file.name,
    storage_path: path,
    total_rows: preview.totalRows,
    valid_rows: preview.records.length,
    issues: preview.issues,
    snapshot: preview.records
  }).select("id").single();
  if (batchError || !batch) {
    console.error(`Import batch could not be saved: ${batchError?.message}`);
    const { error: removeError } = await client.storage.from("imports").remove([path]);
    if (removeError) console.error(`Stored import file ${path} could not be removed: ${removeError.message}`);
    throw new HttpError(500, "The import preview could not be saved.");
  }
  return { id: batch.id as string, totalRows: preview.totalRows, validRows: preview.records.length, issues: preview.issues, changes };
}

export type PublishOutcome =
  | { status: "published" }
  | { status: "failed" }
  /** Publishing would retire a different number of listings than the admin confirmed. */
  | { status: "unconfirmed"; retirements: number };

/**
 * Publishes a draft import batch after checking that it retires exactly `confirmedRetirements`
 * listings, the number the admin confirmed from the preview. The count is taken again here, so a
 * directory that changed after the preview, or a request that skipped the form, cannot retire
 * listings nobody confirmed. (Two admins publishing at the same moment could still race between
 * this check and the publish; there is one admin.)
 *
 * publish_import's own exception handler sets status 'failed' and then re-raises, which rolls that
 * update back with the rest of the transaction, so the failure is recorded here instead. Only a
 * batch that is still a draft is marked: a batch that was already published (a repeated request)
 * keeps its status.
 */
export async function publishImportBatch(batchId: string, confirmedRetirements: number): Promise<PublishOutcome> {
  const client = getAdminSupabase();
  const { data: batch, error: batchError } = await client.from("import_batches").select("status, snapshot").eq("id", batchId).maybeSingle();
  // publish_import refuses anything but a draft too; checking first skips the directory read.
  if (batchError) throw new Error(`Import batch lookup failed: ${batchError.message}`);
  if (batch?.status !== "draft") return { status: "failed" };
  const retirements = compareWithDirectory(batch.snapshot as ProviderLocation[], await directory.listLocations()).retired.length;
  if (retirements !== confirmedRetirements) return { status: "unconfirmed", retirements };

  const { error } = await client.rpc("publish_import", { p_batch_id: batchId });
  if (!error) return { status: "published" };
  console.error(`Import publish failed: ${error.message}`);
  const { error: markError } = await client.from("import_batches").update({ status: "failed" }).eq("id", batchId).eq("status", "draft");
  // Recording the failure is secondary: the publish was rolled back either way.
  if (markError) console.error(`Marking the import as failed did not save: ${markError.message}`);
  return { status: "failed" };
}

/**
 * Publishes a draft import batch for an administrator, turning the outcome into the error they
 * see: a 409 when the confirmed retirements no longer match, a 500 when the publish fails.
 */
export async function publishImport(_admin: AdminActor, id: string, confirmedRetirements: number) {
  const outcome = await publishImportBatch(parseId(id, "This import was not found."), confirmedRetirements);
  if (outcome.status === "unconfirmed") {
    throw new HttpError(409, `Publishing would retire ${outcome.retirements} listing(s), but ${confirmedRetirements} were confirmed. The directory may have changed since this preview; validate the file again to see the current changes.`);
  }
  if (outcome.status === "failed") throw new HttpError(500, "The import could not be published. The prior public directory remains unchanged; upload a corrected CSV to try again.");
}
