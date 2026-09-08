import assert from "node:assert/strict";
import test from "node:test";
import { getAllLocations, parseSearchFilters, searchLocations } from "@/lib/locations";

test("the launch snapshot has the documented number of locations", () => {
  assert.equal(getAllLocations().length, 945);
  assert.equal(searchLocations({ query: "", county: "", tags: [], status: "active", page: 1 }).total, 928);
});

test("search defaults to active records and applies county and tag filters", () => {
  const filters = parseSearchFilters({ county: "Hennepin", tag: "Foster Care / Supported Living" });
  const result = searchLocations(filters);
  assert.equal(filters.status, "active");
  assert.ok(result.total > 0);
  assert.ok(result.items.every((location) => location.status_class === "active" && location.county === "Hennepin"));
});

test("search accepts repeated tags with any-tag semantics", () => {
  const filters = parseSearchFilters({ tag: ["Crisis Respite", "Remote Overnight Supervision"], status: "all" });
  const result = searchLocations(filters);
  assert.ok(result.items.every((location) => location.tags.some((tag) => filters.tags.includes(tag))));
});

test("invalid query filters are safely discarded", () => {
  const filters = parseSearchFilters({ county: "Unknown County", tag: "Not a category", page: "not-a-page" });
  assert.deepEqual(filters.tags, []);
  assert.equal(filters.county, "");
  assert.equal(filters.page, 1);
});
