import assert from "node:assert/strict";
import test from "node:test";
import { directory } from "@/lib/directory";
import { snapshotDirectory, snapshotLocations } from "@/lib/directory/snapshot";
import { dhsLicenseUrl, mapsUrl, searchByCountyHref, searchByTagHref, searchByTextHref } from "@/lib/links";
import { parseSearchFilters } from "@/lib/search-filters";
import { SERVICE_TAGS } from "@/lib/types";

// What the /search page receives for a given href: single values arrive as plain strings.
function searchParamsOf(href: string) {
  const url = new URL(href, "https://licensedcare.example");
  assert.equal(url.pathname, "/search", href);
  return Object.fromEntries(url.searchParams);
}

test("license numbers deep-link to the DHS licensing lookup", () => {
  assert.equal(dhsLicenseUrl("1073601"), "https://licensinglookup.dhs.state.mn.us/Details.aspx?l=1073601");
  assert.equal(dhsLicenseUrl(" 1073601 "), "https://licensinglookup.dhs.state.mn.us/Details.aspx?l=1073601");
  const odd = new URL(dhsLicenseUrl("10&x=1#y"));
  assert.equal(odd.host, "licensinglookup.dhs.state.mn.us");
  assert.equal(odd.searchParams.get("l"), "10&x=1#y");
  assert.equal(odd.hash, "");
});

test("addresses open a Google Maps search with the full street address", () => {
  const url = new URL(mapsUrl({ address: "1120 Oakview Dr #102", city: "Duluth", zip: "55811" }));
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query"), "1120 Oakview Dr #102, Duluth, MN 55811");
  assert.equal(url.hash, "", "a unit number's # must not become a fragment");
});

test("a missing zip still produces a clean Maps query", () => {
  const url = new URL(mapsUrl({ address: "27 Fairfax St", city: "Duluth", zip: "" }));
  assert.equal(url.searchParams.get("query"), "27 Fairfax St, Duluth, MN");
});

test("every service tag link round-trips through the search filter parser", () => {
  for (const tag of SERVICE_TAGS) {
    assert.deepEqual(parseSearchFilters(searchParamsOf(searchByTagHref(tag)), []).tags, [tag], tag);
  }
});

// Validated the way /search does it: against the directory's counties (the database's when configured).
test("every county link round-trips through the search filter parser", async () => {
  const counties = await directory.getCounties();
  assert.ok(counties.includes("St. Louis"));
  for (const county of counties) {
    assert.equal(parseSearchFilters(searchParamsOf(searchByCountyHref(county)), counties).county, county, county);
  }
});

test("every listed city link finds that city's providers", async () => {
  for (const city of new Set(snapshotLocations.map((location) => location.city))) {
    const filters = { ...parseSearchFilters(searchParamsOf(searchByTextHref(city)), []), status: "all" as const };
    assert.equal(filters.query, city);
    assert.ok((await snapshotDirectory.search(filters)).total > 0, city);
  }
});
