import { getDirectoryLocations } from "@/lib/locations";
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
  if (batchError || batch?.status !== "draft") return { status: "failed" };
  const retirements = compareWithDirectory(batch.snapshot as ProviderLocation[], await getDirectoryLocations()).retired.length;
  if (retirements !== confirmedRetirements) return { status: "unconfirmed", retirements };

  const { error } = await client.rpc("publish_import", { p_batch_id: batchId });
  if (!error) return { status: "published" };
  await client.from("import_batches").update({ status: "failed" }).eq("id", batchId).eq("status", "draft");
  return { status: "failed" };
}
