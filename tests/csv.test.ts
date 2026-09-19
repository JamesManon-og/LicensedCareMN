import assert from "node:assert/strict";
import test from "node:test";
import { parseNormalizedCsv, REQUIRED_IMPORT_HEADERS } from "@/lib/csv";
import { snapshotLocations } from "@/lib/directory/snapshot";

const header = "license_number,program_name,company,address,city,county,zip,phone,license_status,tags";

test("a normalized CSV derives directory fields", () => {
  const preview = parseNormalizedCsv(`${header}\n999001,Example Home,Example Care LLC,1 Main St,Minneapolis,Hennepin,55401,555-555-1212,Active,Foster Care / Supported Living|Crisis Respite`);
  assert.equal(preview.issues.length, 0);
  assert.equal(preview.records.length, 1);
  assert.equal(preview.records[0].slug, "example-home-minneapolis-999001");
  assert.equal(preview.records[0].status_class, "active");
  assert.equal(preview.records[0].tier, "C - Single-location");
});

test("CSV validation rejects duplicate licenses and invalid service tags", () => {
  const preview = parseNormalizedCsv(`${header}\n999001,Example Home,Example Care LLC,1 Main St,Minneapolis,Hennepin,55401,,Active,Invalid Tag\n999001,Second Home,Example Care LLC,2 Main St,Minneapolis,Hennepin,55401,,Active,Foster Care / Supported Living`);
  assert.equal(preview.records.length, 0);
  assert.equal(preview.issues.length, 2);
});

test("a __proto__ header column neither pollutes prototypes nor stands in for required columns", () => {
  const partial = parseNormalizedCsv("__proto__,program_name\npolluted,Example Home");
  assert.equal(partial.records.length, 0);
  assert.match(partial.issues[0]?.message ?? "", /^Missing required columns: license_number,/);

  const full = parseNormalizedCsv(`__proto__,${header}\npolluted,999001,Example Home,Example Care LLC,1 Main St,Minneapolis,Hennepin,55401,,Active,Crisis Respite`);
  assert.deepEqual(full.issues, []);
  assert.equal(full.records[0]?.license_number, "999001");
  assert.equal(Object.getPrototypeOf(full.records[0]), Object.prototype);
  assert.equal(({} as Record<string, unknown>).license_number, undefined);
});

test("derived slugs stay a single URL path segment", () => {
  const preview = parseNormalizedCsv(`${header}\n12 34/5,Example Home,Example Care LLC,1 Main St,Minneapolis,Hennepin,55401,,Active,Crisis Respite`);
  assert.equal(preview.records[0]?.slug, "example-home-minneapolis-12-34-5");
});

test("a service tag listed twice is stored once", () => {
  const preview = parseNormalizedCsv(`${header}\n999001,Example Home,Example Care LLC,1 Main St,Minneapolis,Hennepin,55401,,Active,Crisis Respite|Crisis Respite`);
  assert.deepEqual(preview.records[0]?.tags, ["Crisis Respite"]);
});

test("header problems are reported as such", () => {
  assert.deepEqual(parseNormalizedCsv(header).issues.map((issue) => issue.message), ["The CSV has a header row but no provider rows"]);
  assert.deepEqual(parseNormalizedCsv(`${header},tags\n999001,Example Home,Example Care LLC,1 Main St,Minneapolis,Hennepin,55401,,Active,Crisis Respite,Bogus`).issues.map((issue) => issue.message), ["Columns appear more than once: tags"]);
});

test("issues point at the line of the row, counting blank lines", () => {
  const preview = parseNormalizedCsv(`${header}\n999001,Example Home,Example Care LLC,1 Main St,Minneapolis,Hennepin,55401,,Active,Crisis Respite\n\n\n999002,Other Home,Example Care LLC,2 Main St,Minneapolis,Hennepin,55401,,Active,Bogus`);
  assert.deepEqual(preview.issues.map((issue) => issue.row), [5]);
});

test("ZIP codes are validated and a County suffix is dropped", () => {
  const row = (county: string, zip: string) => `${header}\n999001,Example Home,Example Care LLC,1 Main St,Minneapolis,${county},${zip},,Active,Crisis Respite`;
  assert.equal(parseNormalizedCsv(row("Hennepin County", "55401-1234")).records[0]?.county, "Hennepin");
  assert.match(parseNormalizedCsv(row("Hennepin", "abc")).issues[0]?.message ?? "", /^zip: /);
});

test("every launch-snapshot record passes the importer's validation", () => {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = snapshotLocations.map((location) =>
    REQUIRED_IMPORT_HEADERS.map((column) => quote(column === "tags" ? location.tags.join("|") : String(location[column] ?? ""))).join(",")
  );
  const preview = parseNormalizedCsv([REQUIRED_IMPORT_HEADERS.join(","), ...lines].join("\n"));
  assert.deepEqual(preview.issues, []);
  assert.equal(preview.records.length, snapshotLocations.length);
});
