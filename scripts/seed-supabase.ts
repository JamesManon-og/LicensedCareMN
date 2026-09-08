import { getAllLocations } from "@/lib/locations";
import { getAdminSupabase } from "@/lib/supabase";

async function seed() {
  const client = getAdminSupabase();
  const records = getAllLocations();
  const { data: batch, error } = await client.from("import_batches").insert({
    status: "draft",
    source_filename: "locations.json",
    storage_path: "seed/locations.json",
    total_rows: records.length,
    valid_rows: records.length,
    issues: [],
    snapshot: records
  }).select("id").single();
  if (error || !batch) throw new Error(error?.message || "Could not create the seed batch.");
  const { error: publishError } = await client.rpc("publish_import", { p_batch_id: batch.id });
  if (publishError) throw new Error(publishError.message);
  console.log(`Published ${records.length} provider locations.`);
}

seed().catch((error) => { console.error(error); process.exitCode = 1; });
