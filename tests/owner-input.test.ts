import assert from "node:assert/strict";
import test from "node:test";
import { isHttpUrl, normalizeEmail } from "@/lib/owner-input";

test("emails normalize so a signed-in owner matches the stored claim", () => {
  assert.equal(normalizeEmail("Owner@Example.COM"), "owner@example.com");
  assert.equal(normalizeEmail(" owner@example.com "), "owner@example.com");
});

test("owner websites must be http(s) URLs", () => {
  for (const url of ["https://example.com", "http://example.com/care?x=1", "HTTPS://EXAMPLE.COM"]) {
    assert.equal(isHttpUrl(url), true, url);
  }
  for (const url of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://example.com", "//example.com", "/relative", "example.com", ""]) {
    assert.equal(isHttpUrl(url), false, url);
  }
});
