import assert from "node:assert/strict";
import test from "node:test";
import type { Actor, AdminActor } from "@/lib/auth";
import { decideClaim, submitClaim } from "@/lib/claims";
import { HttpError } from "@/lib/http";
import { createImportPreview, publishImport } from "@/lib/imports";
import { getOwnerListings, ownerProfileSchema, saveOwnerProfile } from "@/lib/owner";
import { getAdminSupabase, hasSupabaseConfig } from "@/lib/supabase";

// The functions behind the API routes, called the way the routes call them but with the signed-in
// user built by the test instead of read from cookies. Like directory-consistency.test.ts these run
// against a seeded database: they add one test listing, one auth user and a few import batches, and
// remove them again. Run the file on its own:
//   npx tsx --env-file=.env --test tests/route-functions.test.ts
const live = { skip: hasSupabaseConfig ? false : "Supabase is not configured" };

const admin: AdminActor = { id: crypto.randomUUID(), email: "test.admin@example.com", role: "admin" };
const rejectsWith = (status: number) => (error: unknown) => error instanceof HttpError && error.status === status;
const header = "license_number,program_name,company,address,city,county,zip,phone,license_status,tags";
const csvFile = (name: string, content: string) => new File([content], name, { type: "text/csv" });

const listing = {
  license_number: "STAGE6-TEST-0001",
  slug: "stage-6-test-home-testville-stage6-test-0001",
  program_name: "Stage 6 Test Home",
  company: "Stage 6 Test Care LLC",
  tier: "C - Single-location",
  address: "1 Test St",
  city: "Testville",
  county: "Hennepin",
  zip: "55401",
  phone: null,
  license_status: "Active",
  status_class: "active",
  tags: ["Crisis Respite"],
  primary_tag: "Crisis Respite"
};

test("an owner can save a listing's content only while they hold an approved claim on it", live, async (t) => {
  const client = getAdminSupabase();
  const must = async (request: PromiseLike<{ error: unknown }>) => assert.ifError((await request).error);
  await must(client.from("provider_locations").insert(listing));
  // Deleting the listing cascades to its claims and provider profile.
  t.after(async () => { await client.from("provider_locations").delete().eq("license_number", listing.license_number); });
  // provider_profiles.updated_by references auth.users, so the owner is a real auth user (creating one sends no email).
  const { data: created, error } = await client.auth.admin.createUser({ email: "stage6.owner@example.com", email_confirm: true });
  assert.ifError(error);
  t.after(async () => { await client.auth.admin.deleteUser(created.user!.id); });
  const owner: Actor = { id: created.user!.id, email: "stage6.owner@example.com" };
  const input = { licenseNumber: listing.license_number, description: "Stage 6 content", website: "https://example.com", contactEmail: "", contactPhone: "555" };

  await assert.rejects(saveOwnerProfile(owner, input), rejectsWith(403), "no claim");
  assert.deepEqual(await getOwnerListings(owner), []);

  // The claim is submitted with different capitalisation from the signed-in email.
  await submitClaim({ licenseNumber: listing.license_number, name: "Test Owner", email: "Stage6.Owner@Example.com", role: "Administrator" });
  const { data: claim } = await client.from("provider_claims").select("id").eq("license_number", listing.license_number).single();
  await assert.rejects(saveOwnerProfile(owner, input), rejectsWith(403), "pending claim");

  assert.equal(await decideClaim(admin, claim!.id, "approved"), listing.slug);
  assert.equal(await saveOwnerProfile(owner, input), listing.slug);
  const { data: saved } = await client.from("provider_profiles").select("description, website, contact_email, contact_phone, updated_by").eq("license_number", listing.license_number).single();
  assert.deepEqual(saved, { description: "Stage 6 content", website: "https://example.com", contact_email: null, contact_phone: "555", updated_by: owner.id });
  await assert.rejects(saveOwnerProfile({ id: admin.id, email: admin.email }, input), rejectsWith(403), "someone else's claim");

  const listings = await getOwnerListings(owner);
  assert.deepEqual(listings.map(({ provider, profile }) => [provider.slug, profile?.description]), [[listing.slug, "Stage 6 content"]]);

  // A listing that is no longer current drops out of the owner's list.
  await must(client.from("provider_locations").update({ is_current: false }).eq("license_number", listing.license_number));
  assert.deepEqual(await getOwnerListings(owner), []);
  await must(client.from("provider_locations").update({ is_current: true }).eq("license_number", listing.license_number));

  assert.equal(await decideClaim(admin, claim!.id, "revoked"), listing.slug);
  await assert.rejects(saveOwnerProfile(owner, input), rejectsWith(403), "revoked claim");
});

test("owner content accepts only http(s) websites and bounded fields", () => {
  const valid = { licenseNumber: "1073601" };
  assert.equal(ownerProfileSchema.safeParse({ ...valid, website: "https://example.com" }).success, true);
  assert.equal(ownerProfileSchema.safeParse({ ...valid, website: "" }).success, true);
  assert.equal(ownerProfileSchema.safeParse({ ...valid, website: "javascript:alert(1)" }).success, false);
  assert.equal(ownerProfileSchema.safeParse({ ...valid, website: "data:text/html,hi" }).success, false);
  assert.equal(ownerProfileSchema.safeParse({ ...valid, contactEmail: "not an email" }).success, false);
  assert.equal(ownerProfileSchema.safeParse({ ...valid, description: "x".repeat(1201) }).success, false);
});

test("a claim for a listing that is not in the directory is a 404", live, async () => {
  await assert.rejects(submitClaim({ licenseNumber: "0000000", name: "Test Owner", email: "test@example.com", role: "Administrator" }), rejectsWith(404));
});

test("an import preview checks the file, counts its changes and saves a batch", live, async (t) => {
  const client = getAdminSupabase();
  const ids: string[] = [];
  t.after(async () => {
    const { data: batches } = await client.from("import_batches").select("storage_path").in("id", ids);
    const paths = (batches ?? []).map((batch) => batch.storage_path as string);
    if (paths.length) await client.storage.from("imports").remove(paths);
    await client.from("import_batches").delete().in("id", ids);
  });

  await assert.rejects(createImportPreview(admin, null), rejectsWith(400), "no file");
  await assert.rejects(createImportPreview(admin, "not a file"), rejectsWith(400), "a text field");
  await assert.rejects(createImportPreview(admin, new File([header], "listings.txt")), rejectsWith(400), "not a .csv");
  await assert.rejects(createImportPreview(admin, csvFile("big.csv", header + "\n" + "x".repeat(4 * 1024 * 1024))), rejectsWith(413));

  const invalid = await createImportPreview(admin, csvFile("bad.csv", `${header}\n1,x,x,x,x,x,bad-zip,,Active,Crisis Respite`));
  ids.push(invalid.id);
  assert.equal(invalid.validRows, 0);
  assert.equal(invalid.changes, null, "an invalid file is not compared");
  assert.deepEqual(invalid.issues.map((issue) => issue.row), [2]);

  const current = (await client.from("provider_locations").select("*", { count: "exact", head: true }).eq("is_current", true)).count!;
  const partial = await createImportPreview(admin, csvFile("one.csv", `${header}\n999006,New Home,New Care LLC,1 Main St,Duluth,St. Louis,55801,,Active,Crisis Respite`));
  ids.push(partial.id);
  assert.deepEqual({ ...partial.changes!, retired: partial.changes!.retired.length }, { added: 1, updated: 0, unchanged: 0, retired: current });
  const { data: batch } = await client.from("import_batches").select("status, total_rows, valid_rows").eq("id", partial.id).single();
  assert.deepEqual(batch, { status: "draft", total_rows: 1, valid_rows: 1 });

  // Publishing that draft would retire every current listing, so it needs that exact confirmation.
  await assert.rejects(publishImport(admin, partial.id, 0), rejectsWith(409));
  await assert.rejects(publishImport(admin, "abc", 0), rejectsWith(404), "malformed id");
  await assert.rejects(publishImport(admin, crypto.randomUUID(), 0), rejectsWith(500), "unknown batch");
  await assert.rejects(publishImport(admin, invalid.id, 0), rejectsWith(500), "an invalid batch cannot be published");
  assert.equal((await client.from("import_batches").select("status").eq("id", partial.id).single()).data?.status, "draft");
});
