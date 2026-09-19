import assert from "node:assert/strict";
import test from "node:test";
import { snapshotDirectory } from "@/lib/directory/snapshot";
import { supabaseDirectory } from "@/lib/directory/supabase";
import { MAX_PAGE, PAGE_SIZE, paginate, parseSearchFilters } from "@/lib/search-filters";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { SearchFilters } from "@/lib/types";

const filters = (overrides: Partial<SearchFilters> = {}): SearchFilters => ({ query: "", county: "", tags: [], status: "active", page: 1, ...overrides });

test("paginate clamps requested pages into the available range", () => {
  assert.deepEqual(paginate(0, 100), { page: 1, totalPages: 5, offset: 0 });
  assert.deepEqual(paginate(-3, 100), { page: 1, totalPages: 5, offset: 0 });
  assert.deepEqual(paginate(9999, 100), { page: 5, totalPages: 5, offset: 96 });
  assert.deepEqual(paginate(2, 48), { page: 2, totalPages: 2, offset: 24 });
  assert.deepEqual(paginate(3, 0), { page: 1, totalPages: 1, offset: 0 });
});

test("snapshot search returns the rows of the clamped page it reports", async () => {
  const last = await snapshotDirectory.search(filters({ page: 9999 }));
  assert.equal(last.page, last.totalPages);
  assert.equal(last.items.length, last.total - (last.totalPages - 1) * PAGE_SIZE);
  assert.deepEqual((await snapshotDirectory.search(filters({ page: 0 }))).items, (await snapshotDirectory.search(filters())).items);
});

test("page parameters are normalised to a positive, bounded integer", () => {
  assert.equal(parseSearchFilters({ page: "0" }, []).page, 1);
  assert.equal(parseSearchFilters({ page: "-4" }, []).page, 1);
  assert.equal(parseSearchFilters({ page: "99999999999" }, []).page, MAX_PAGE);
  assert.equal(parseSearchFilters({ page: ["2", "3"] }, []).page, 1);
  assert.equal(parseSearchFilters({ page: "3" }, []).page, 3);
});

test("St., St and Saint match the same places, and a license number or ZIP finds its listing", async () => {
  const search = async (query: string) => snapshotDirectory.search(filters({ query }));
  const totals = await Promise.all(["St. Paul", "St Paul", "Saint Paul"].map(async (query) => (await search(query)).total));
  assert.ok(totals[0] > 0);
  assert.deepEqual(new Set(totals).size, 1, String(totals));
  assert.equal((await search("Saint Louis Park")).total, (await search("St Louis Park")).total);
  assert.deepEqual((await search("1073601")).items.map((item) => item.license_number), ["1073601"]);
  assert.ok((await search("55808")).items.every((item) => item.zip.startsWith("55808")));
  assert.ok((await search("55808")).total > 0);
});

// The tests below call the search_directory RPC against a database seeded from the launch
// snapshot (npm run seed:supabase). Run them with: npx tsx --env-file=.env --test tests/search.test.ts
const live = { skip: hasSupabaseConfig ? false : "Supabase is not configured" };
const searchText = (item: { program_name: string; company: string; city: string; county: string }) => [item.program_name, item.company, item.city, item.county].join(" ");

test("database search tolerates typos", live, async () => {
  for (const [typo, intended] of [["Minneapols", "Minneapolis"], ["Duluht", "Duluth"]]) {
    const result = await supabaseDirectory.search(filters({ query: typo }));
    assert.ok(result.total > 0, typo);
    assert.ok(result.items.every((item) => searchText(item).includes(intended)), typo);
  }
  assert.equal((await supabaseDirectory.search(filters({ query: "Yasins Home" }))).items[0]?.program_name, "Yassins Home Inc");
});

// Whether the two sources agree on search totals is checked in tests/directory.test.ts.
test("database search never drops an exact match", live, async () => {
  const exact = filters({ query: "home duluth" });
  const found = new Set((await supabaseDirectory.search(exact)).items.map((item) => item.license_number));
  assert.ok((await snapshotDirectory.search(exact)).items.every((item) => found.has(item.license_number)));
});

test("database search ranks an exact name first and treats LIKE wildcards literally", live, async () => {
  assert.equal((await supabaseDirectory.search(filters({ query: "Yassins Home Inc" }))).items[0]?.program_name, "Yassins Home Inc");
  assert.equal((await supabaseDirectory.search(filters({ query: "%" }))).total, 0);
});

test("database search treats St., St and Saint alike and finds license numbers and ZIP codes", live, async () => {
  for (const [spellings, expected] of [[["St. Paul", "St Paul", "Saint Paul"], "Saint Paul"], [["St Louis Park", "Saint Louis Park"], "St Louis Park"]] as const) {
    const totals = await Promise.all(spellings.map(async (query) => (await supabaseDirectory.search(filters({ query }))).total));
    assert.equal(new Set(totals).size, 1, `${spellings.join(" / ")}: ${totals}`);
    assert.equal(totals[0], (await snapshotDirectory.search(filters({ query: spellings[0] }))).total);
    assert.ok((await supabaseDirectory.search(filters({ query: spellings[1] }))).items.some((item) => item.city === expected));
  }
  assert.equal((await supabaseDirectory.search(filters({ query: "1073601" }))).items[0]?.license_number, "1073601");
  assert.equal((await supabaseDirectory.search(filters({ query: "55808" }))).total, (await snapshotDirectory.search(filters({ query: "55808" }))).total);
});

test("database search clamps out-of-range pages and reports real empty results", live, async () => {
  const last = await supabaseDirectory.search(filters({ page: 9999 }));
  assert.equal(last.page, last.totalPages);
  assert.equal(last.items.length, last.total - (last.totalPages - 1) * PAGE_SIZE);
  const none = await supabaseDirectory.search(filters({ query: "xyzzy" }));
  assert.deepEqual([none.total, none.items.length, none.page], [0, 0, 1]);
});

test("searches with no results suggest queries that have results under the same filters", live, async () => {
  assert.ok((await supabaseDirectory.suggest(filters({ query: "Grve" }))).includes("Maple Grove"));
  for (const current of [filters({ query: "Grve" }), filters({ query: "Stilwater crisis", county: "Washington" })]) {
    const suggestions = await supabaseDirectory.suggest(current);
    assert.ok(suggestions.length > 0, current.query);
    for (const query of suggestions) assert.ok((await supabaseDirectory.search({ ...current, query })).total > 0, query);
  }
  assert.deepEqual(await supabaseDirectory.suggest(filters({ query: "xyzzy" })), []);
});
