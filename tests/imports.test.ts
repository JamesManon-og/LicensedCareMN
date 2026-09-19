import assert from "node:assert/strict";
import test from "node:test";
import { compareWithDirectory } from "@/lib/imports";
import { getAllLocations } from "@/lib/locations";

const directory = getAllLocations();
const [first, second, third] = directory;

test("an import is compared with the directory as additions, updates, unchanged rows and retirements", () => {
  const added = { ...first, license_number: "999001", slug: "example-home-minneapolis-999001" };
  const updated = { ...second, phone: "555-555-1212" };
  const changes = compareWithDirectory([added, updated, first], [first, second, third]);
  assert.equal(changes.added, 1);
  assert.equal(changes.updated, 1);
  assert.equal(changes.unchanged, 1);
  assert.deepEqual(changes.retired, [{ license_number: third.license_number, program_name: third.program_name, city: third.city }]);
});

test("a change to any published field, including tag order, is an update", () => {
  const multiTag = directory.find((location) => location.tags.length > 1)!;
  assert.equal(compareWithDirectory([{ ...multiTag, tags: [...multiTag.tags].reverse() }], [multiTag]).updated, 1);
  assert.equal(compareWithDirectory([{ ...first, tier: "Z - Test tier" }], [first]).updated, 1);
  assert.equal(compareWithDirectory([{ ...first, id: "a database id" }], [first]).unchanged, 1, "the row id is not published");
});

test("the full directory changes nothing, and a one-row file retires everything else", () => {
  assert.deepEqual(compareWithDirectory(directory, directory), { added: 0, updated: 0, unchanged: directory.length, retired: [] });
  const oneRow = compareWithDirectory([first], directory);
  assert.equal(oneRow.unchanged, 1);
  assert.equal(oneRow.retired.length, directory.length - 1);
});
