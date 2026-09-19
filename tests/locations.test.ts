import assert from "node:assert/strict";
import test from "node:test";
import { snapshotDirectory, snapshotLocations } from "@/lib/directory/snapshot";
import { parseSearchFilters } from "@/lib/search-filters";

test("the launch snapshot has the documented number of locations", async () => {
  assert.equal(snapshotLocations.length, 945);
  assert.equal((await snapshotDirectory.search({ query: "", county: "", tags: [], status: "active", page: 1 })).total, 928);
});

test("search defaults to active records and applies county and tag filters", async () => {
  const filters = parseSearchFilters({ county: "Hennepin", tag: "Foster Care / Supported Living" }, await snapshotDirectory.getCounties());
  const result = await snapshotDirectory.search(filters);
  assert.equal(filters.status, "active");
  assert.ok(result.total > 0);
  assert.ok(result.items.every((location) => location.status_class === "active" && location.county === "Hennepin"));
});

test("search accepts repeated tags with any-tag semantics", async () => {
  const filters = parseSearchFilters({ tag: ["Crisis Respite", "Remote Overnight Supervision"], status: "all" }, []);
  const result = await snapshotDirectory.search(filters);
  assert.ok(result.items.every((location) => location.tags.some((tag) => filters.tags.includes(tag))));
});

test("invalid query filters are safely discarded", async () => {
  const filters = parseSearchFilters({ county: "Unknown County", tag: "Not a category", page: "not-a-page" }, await snapshotDirectory.getCounties());
  assert.deepEqual(filters.tags, []);
  assert.equal(filters.county, "");
  assert.equal(filters.page, 1);
});

test("the county filter accepts exactly the counties it is given", async () => {
  assert.equal(parseSearchFilters({ county: "Imported" }, ["Hennepin", "Imported"]).county, "Imported");
  assert.equal(parseSearchFilters({ county: "Hennepin" }, ["Imported"]).county, "");
  assert.equal(parseSearchFilters({ county: "Hennepin" }, await snapshotDirectory.getCounties()).county, "Hennepin");
});
