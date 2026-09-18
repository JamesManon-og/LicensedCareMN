import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { POST as submitClaim } from "@/app/api/claims/route";
import { publishImportBatch } from "@/lib/imports";
import { getAllLocations, getCounties, getDirectoryCounties, getDirectoryProvider, getDirectoryProviderByLicense } from "@/lib/locations";
import { getOwnerContent } from "@/lib/owner-content";
import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

// These tests run against a database seeded from the launch snapshot (npm run seed:supabase) with
// supabase/migrations/0003_directory_consistency.sql applied. They briefly add one test listing and
// two import batches, and remove them again. Run the file on its own, so the snapshot-parity checks
// in search.test.ts never see the test listing:
//   npx tsx --env-file=.env --test tests/directory-consistency.test.ts
const live = { skip: hasSupabaseConfig ? false : "Supabase is not configured" };

// An imported listing: current in the database, absent from the launch snapshot.
const imported = {
  license_number: "STAGE4-TEST-0001",
  slug: "stage-4-test-home-testville-stage4-test-0001",
  program_name: "Stage 4 Test Home",
  company: "Stage 4 Test Care LLC",
  tier: "C - Single-location",
  address: "1 Test St",
  city: "Testville",
  county: "Hennepin",
  zip: "55401",
  phone: null,
  license_status: "Closed",
  status_class: "critical",
  tags: ["Crisis Respite"],
  primary_tag: "Crisis Respite"
};

const claimRequest = () =>
  new Request("http://localhost/api/claims", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ licenseNumber: imported.license_number, name: "Test Owner", email: "Test.Owner@Example.com", role: "Administrator" })
  });

test("publish_import cannot be called with the publishable key", live, async () => {
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  // A random batch id: even if the call were allowed it would only raise "Import batch not found".
  const { error } = await anon.rpc("publish_import", { p_batch_id: crypto.randomUUID() });
  assert.equal(error?.code, "42501", JSON.stringify(error));
});

test("a failed publish marks its draft failed and leaves other batches alone", live, async (t) => {
  const client = getAdminSupabase();
  const createBatch = async (status: string, snapshot: unknown[]) => {
    const { data, error } = await client
      .from("import_batches")
      .insert({ status, source_filename: "stage4-test.csv", storage_path: "test/stage4-test.csv", total_rows: snapshot.length, valid_rows: snapshot.length, issues: [], snapshot })
      .select("id")
      .single();
    assert.ifError(error);
    t.after(async () => { await client.from("import_batches").delete().eq("id", data!.id); });
    return data!.id as string;
  };
  const statusOf = async (id: string) => (await client.from("import_batches").select("status").eq("id", id).single()).data?.status;

  // A record with no fields violates provider_operators' not-null name on the first insert, so this
  // publish can only fail, and it fails before anything could be retired.
  const failing = await createBatch("draft", [{}]);
  assert.ok(await publishImportBatch(failing));
  assert.equal(await statusOf(failing), "failed");

  const invalid = await createBatch("invalid", []);
  assert.ok(await publishImportBatch(invalid));
  assert.equal(await statusOf(invalid), "invalid");
});

test("an imported listing can be claimed, and its owner content is public only while the claim is approved", live, async (t) => {
  const client = getAdminSupabase();
  const must = async (request: PromiseLike<{ error: unknown }>) => assert.ifError((await request).error);
  await must(client.from("provider_locations").insert(imported));
  // Deleting the listing cascades to its claims and provider profile.
  t.after(async () => { await client.from("provider_locations").delete().eq("license_number", imported.license_number); });

  assert.equal(getAllLocations().some((location) => location.license_number === imported.license_number), false);
  assert.equal((await getDirectoryProviderByLicense(imported.license_number))?.slug, imported.slug);

  assert.equal((await submitClaim(claimRequest())).status, 200);
  const { data: claim } = await client.from("provider_claims").select("id, claimant_email").eq("license_number", imported.license_number).single();
  assert.equal(claim?.claimant_email, "test.owner@example.com");

  await must(client.from("provider_profiles").insert({ license_number: imported.license_number, description: "Test content", website: "javascript:alert(1)" }));
  assert.equal(await getOwnerContent(imported.license_number), null, "pending claim");

  await must(client.from("provider_claims").update({ status: "approved" }).eq("id", claim!.id));
  const content = await getOwnerContent(imported.license_number);
  assert.equal(content?.description, "Test content");
  assert.equal(content?.website, null, "a javascript: website is never rendered");

  await must(client.from("provider_claims").update({ status: "rejected" }).eq("id", claim!.id));
  assert.equal(await getOwnerContent(imported.license_number), null, "revoked claim");

  await must(client.from("provider_locations").update({ is_current: false }).eq("license_number", imported.license_number));
  assert.equal(await getDirectoryProvider(imported.slug), null);
  assert.equal((await submitClaim(claimRequest())).status, 404);
});

test("the county filter lists the counties of current listings", live, async () => {
  assert.deepEqual((await getDirectoryCounties()).sort(), getCounties().sort());
});
