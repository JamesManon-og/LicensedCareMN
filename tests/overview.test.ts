import assert from "node:assert/strict";
import test from "node:test";
import { summarizeDirectory } from "@/lib/directory/overview";
import { snapshotDirectory, snapshotLocations } from "@/lib/directory/snapshot";
import { SERVICE_TAGS } from "@/lib/types";

const { stats, tagCounts, topCounties } = summarizeDirectory(snapshotLocations);

test("the home page totals count every listing, and active ones separately", async () => {
  assert.equal(stats.locations, 945);
  assert.equal(stats.active, 928);
  assert.equal(stats.counties, (await snapshotDirectory.getCounties()).length);
  assert.equal(stats.companies, new Set(snapshotLocations.map((location) => location.company)).size);
});

test("service-type counts cover every tag, in order, and count active listings only", () => {
  assert.deepEqual([...tagCounts.keys()], [...SERVICE_TAGS]);
  const active = snapshotLocations.filter((location) => location.status_class === "active");
  for (const tag of SERVICE_TAGS) assert.equal(tagCounts.get(tag), active.filter((location) => location.tags.includes(tag)).length, tag);
});

test("leading counties are the 8 with the most active listings, most first", () => {
  assert.equal(topCounties.length, 8);
  topCounties.slice(1).forEach((current, index) => {
    const previous = topCounties[index];
    assert.ok(previous.count > current.count || (previous.count === current.count && previous.county.localeCompare(current.county) < 0), current.county);
  });
  const lowest = topCounties.at(-1)!.count;
  const activeIn = (county: string) => snapshotLocations.filter((location) => location.county === county && location.status_class === "active").length;
  for (const county of new Set(snapshotLocations.map((location) => location.county))) {
    if (!topCounties.some((top) => top.county === county)) assert.ok(activeIn(county) <= lowest, county);
  }
  assert.equal(topCounties[0].count, activeIn(topCounties[0].county));
});
