import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AFTER_LOGIN_PATH, resolveNextPath } from "@/lib/auth-redirect";
import { describeResultCount, initials } from "@/lib/text";

test("post-login redirects keep same-site paths", () => {
  assert.equal(resolveNextPath("/owner"), "/owner");
  assert.equal(resolveNextPath("/admin"), "/admin");
  assert.equal(resolveNextPath("/a/b?c=d"), "/a/b?c=d");
  assert.equal(resolveNextPath("/"), "/");
});

test("post-login redirects reject other origins and non-paths", () => {
  for (const next of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "admin", "/\tevil", " /admin"]) {
    assert.equal(resolveNextPath(next), DEFAULT_AFTER_LOGIN_PATH, next);
  }
});

test("post-login redirects fall back when next is missing", () => {
  assert.equal(resolveNextPath(null), DEFAULT_AFTER_LOGIN_PATH);
  assert.equal(resolveNextPath(undefined), DEFAULT_AFTER_LOGIN_PATH);
  assert.equal(resolveNextPath(""), DEFAULT_AFTER_LOGIN_PATH);
  assert.equal(resolveNextPath("https://evil.com", "/owner"), "/owner");
});

test("validated paths never leave the request origin", () => {
  for (const next of ["/owner", "//evil.com", "/\\evil.com", "https://evil.com"]) {
    assert.equal(new URL(resolveNextPath(next), "https://licensedcare.example/auth/callback").origin, "https://licensedcare.example");
  }
});

test("result counts use singular and plural wording", () => {
  assert.equal(describeResultCount(1), "1 provider matches your search");
  assert.equal(describeResultCount(0), "0 providers match your search");
  assert.equal(describeResultCount(928), "928 providers match your search");
  assert.equal(describeResultCount(1200), "1,200 providers match your search");
});

test("avatar initials come from the first two words", () => {
  assert.equal(initials("A & E Homes Inc"), "AE");
  assert.equal(initials("Accessible Space Inc"), "AS");
  assert.equal(initials("5th Street House"), "5S");
  assert.equal(initials("Adapta"), "AD");
});
