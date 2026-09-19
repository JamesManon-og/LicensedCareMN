import assert from "node:assert/strict";
import test from "node:test";

// A database outage, simulated offline: nothing listens on port 9, so every request is refused at
// once. The variables are set before the modules that read them load, and each test file runs in
// its own process, so no other test sees them.
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "outage-test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "outage-test";

// supabase-js retries a failed read three times, 1, 2 and 4 seconds apart; skip the waits.
const wait = globalThis.setTimeout;
globalThis.setTimeout = ((callback: () => void, _delay?: number, ...args: []) => wait(callback, 0, ...args)) as typeof setTimeout;

// Loaded on first use, after the variables above are set (a static import would load first).
const modules = Promise.all([
  import("@/lib/directory"),
  import("@/lib/directory/supabase"),
  import("@/lib/directory/snapshot"),
  import("@/lib/owner-content"),
  import("@/lib/claims"),
  import("@/lib/owner"),
  import("@/lib/imports")
]).then(([{ directory }, { supabaseDirectory }, { snapshotLocations }, ownerContent, { listClaims }, { getOwnerListings }, { publishImportBatch }]) => ({
  directory,
  supabaseDirectory,
  listing: snapshotLocations[0],
  ...ownerContent,
  listClaims,
  getOwnerListings,
  publishImportBatch
}));

const owner = { id: "00000000-0000-4000-8000-000000000001", email: "owner@example.com" };
const admin = { ...owner, role: "admin" as const };

const filters = { query: "Duluth", county: "", tags: [], status: "active" as const, page: 1 };

// Silences the logging that optional reads do on failure, and returns what they logged.
async function quietly<T>(read: () => Promise<T>) {
  const original = console.error;
  const logged: unknown[] = [];
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    return { result: await read(), logged };
  } finally {
    console.error = original;
  }
}

test("the outage is simulated against the Supabase source", async () => {
  const { directory, supabaseDirectory } = await modules;
  assert.equal(directory, supabaseDirectory);
});

test("required reads fail instead of returning an empty result", async () => {
  const { directory, listing, hasApprovedClaim } = await modules;
  await assert.rejects(directory.listLocations(), /Directory listing failed/);
  await assert.rejects(directory.search(filters), /Directory search failed/);
  await assert.rejects(directory.getBySlug(listing.slug), /Provider lookup failed/);
  await assert.rejects(directory.getByLicense(listing.license_number), /Provider lookup failed/);
  await assert.rejects(directory.getByLicenses([listing.license_number]), /Provider lookup failed/);
  await assert.rejects(directory.getCounties(), /County lookup failed/);
  await assert.rejects(hasApprovedClaim(listing.license_number, owner.email), /Approved claim lookup failed/);
});

test("the claim queue, owner tools and publishing fail instead of showing nothing", async () => {
  const { listClaims, getOwnerListings, publishImportBatch } = await modules;
  await assert.rejects(listClaims(admin), /Claim queue lookup failed/);
  await assert.rejects(getOwnerListings(owner), /Owner claims lookup failed/);
  await assert.rejects(publishImportBatch(owner.id, 0), /Import batch lookup failed/);
});

test("only a 4xx from Supabase Auth means signed out", async () => {
  const { isSignedOut } = await import("@/lib/auth");
  for (const status of [400, 401, 403, 404, 422]) assert.equal(isSignedOut(status), true, `status ${status}`);
  // 0 is a network failure; 502-504 are Supabase Auth being unavailable.
  for (const status of [0, 500, 502, 503, 504, undefined]) assert.equal(isSignedOut(status), false, `status ${status}`);
});

test("optional reads log the failure and come back empty", async () => {
  const { directory, listing, getClaimedLicenses, getListingClaims } = await modules;
  const related = await quietly(() => directory.getRelated(listing));
  assert.deepEqual(related.result, []);
  const suggestions = await quietly(() => directory.suggest(filters));
  assert.deepEqual(suggestions.result, []);
  const badges = await quietly(() => getClaimedLicenses([listing.license_number]));
  assert.equal(badges.result.size, 0);
  const claims = await quietly(() => getListingClaims(listing.license_number, []));
  assert.equal(claims.result.claimed.size, 0);
  assert.equal(claims.result.ownerContent, null);
  for (const { logged } of [related, suggestions, badges, claims]) assert.ok(logged.length > 0, "an optional read failed without logging");
});
