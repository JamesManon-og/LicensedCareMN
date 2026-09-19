import assert from "node:assert/strict";
import test from "node:test";
import { snapshotDirectory } from "@/lib/directory/snapshot";
import type { DirectorySource } from "@/lib/directory/source";
import { supabaseDirectory } from "@/lib/directory/supabase";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { SearchFilters } from "@/lib/types";

// The same contract for both directory sources. The Supabase run needs a database seeded from the
// launch snapshot (npm run seed:supabase) and only reads. Run it with:
//   npx tsx --env-file=.env --test tests/directory.test.ts
const live = { skip: hasSupabaseConfig ? false : "Supabase is not configured" };
const sources: [string, DirectorySource, typeof live][] = [
  ["snapshot", snapshotDirectory, { skip: false }],
  ["supabase", supabaseDirectory, live]
];
const filters = (overrides: Partial<SearchFilters> = {}): SearchFilters => ({ query: "", county: "", tags: [], status: "active", page: 1, ...overrides });

for (const [name, source, options] of sources) {
  test(`${name}: lists the 945 launch listings with unique slugs`, options, async () => {
    const listings = await source.listLocations();
    assert.equal(listings.length, 945);
    assert.equal(new Set(listings.map((location) => location.slug)).size, listings.length);
  });

  test(`${name}: finds a listing by slug or license number, and null for an unknown one`, options, async () => {
    const [known] = await source.listLocations();
    assert.equal((await source.getBySlug(known.slug))?.license_number, known.license_number);
    assert.equal(await source.getBySlug("no-such-provider"), null);
    assert.equal((await source.getByLicense("1073601"))?.slug, "a-e-homes-inc-duluth-1073601");
    assert.equal(await source.getByLicense("0000000"), null);
  });

  test(`${name}: finds several listings by license number in one call, leaving out unknown ones`, options, async () => {
    const found = await source.getByLicenses(["1073601", "0000000", "1076181"]);
    assert.deepEqual(found.map((location) => location.license_number).sort(), ["1073601", "1076181"]);
    assert.deepEqual(await source.getByLicenses([]), []);
  });

  test(`${name}: lists the counties of its listings, sorted`, options, async () => {
    const counties = await source.getCounties();
    assert.deepEqual(new Set(counties), new Set((await source.listLocations()).map((location) => location.county)));
    assert.deepEqual(counties, [...counties].sort((a, b) => a.localeCompare(b)));
  });

  test(`${name}: related providers are other active listings sharing the company or county`, options, async () => {
    const location = (await source.getByLicense("1073601"))!;
    const related = await source.getRelated(location);
    assert.ok(related.length > 0 && related.length <= 3);
    for (const other of related) {
      assert.notEqual(other.slug, location.slug);
      assert.equal(other.status_class, "active");
      assert.ok(other.company === location.company || other.county === location.county, other.slug);
    }
  });
}

test("both sources agree on search totals", live, async () => {
  for (const current of [filters(), filters({ status: "all" }), filters({ county: "Hennepin", tags: ["Foster Care / Supported Living"] }), filters({ county: "St. Louis" })]) {
    assert.equal((await supabaseDirectory.search(current)).total, (await snapshotDirectory.search(current)).total, JSON.stringify(current));
  }
});
