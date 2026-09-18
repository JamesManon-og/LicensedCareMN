import { getAdminSupabase } from "@/lib/supabase";

/**
 * Publishes a draft import batch; returns the error when publishing fails. publish_import's own
 * exception handler sets status 'failed' and then re-raises, which rolls that update back with
 * the rest of the transaction, so the failure is recorded here instead. Only a batch that is
 * still a draft is marked: a batch that was already published (a repeated request) keeps its status.
 */
export async function publishImportBatch(batchId: string) {
  const client = getAdminSupabase();
  const { error } = await client.rpc("publish_import", { p_batch_id: batchId });
  if (error) await client.from("import_batches").update({ status: "failed" }).eq("id", batchId).eq("status", "draft");
  return error;
}
