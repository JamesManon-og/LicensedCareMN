import assert from "node:assert/strict";
import test from "node:test";
import { parseNormalizedCsv } from "@/lib/csv";

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
