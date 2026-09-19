import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import { handleRoute, HttpError, parseId, readJson } from "@/lib/http";

test("a route's HttpError becomes a JSON response with its status and message", async () => {
  const route = handleRoute(async () => { throw new HttpError(409, "Already decided."); });
  const response = await route();
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Already decided." });
});

test("any other error becomes a generic 500 that hides the original message", async (t) => {
  t.mock.method(console, "error", () => {});
  const route = handleRoute(async () => { throw new Error("relation provider_claims: permission denied"); });
  const response = await route();
  assert.equal(response.status, 500);
  assert.doesNotMatch(JSON.stringify(await response.json()), /permission denied/);
});

test("a route that succeeds returns its own response and receives its arguments", async () => {
  const route = handleRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => Response.json({ method: request.method, id: (await params).id }));
  const response = await route(new Request("http://localhost/x", { method: "POST" }), { params: Promise.resolve({ id: "7" }) });
  assert.deepEqual(await response.json(), { method: "POST", id: "7" });
});

test("a malformed id is a 404, and a UUID passes through unchanged", () => {
  assert.throws(() => parseId("abc"), (error) => error instanceof HttpError && error.status === 404);
  const id = crypto.randomUUID();
  assert.equal(parseId(id), id);
  assert.equal(parseId(id.toUpperCase()), id.toUpperCase());
});

test("a missing, malformed or invalid JSON body is a 400 with the given message", async () => {
  const schema = z.object({ decision: z.enum(["approved", "rejected"]) });
  const post = (body?: string) => new Request("http://localhost/x", { method: "POST", body });
  for (const body of [undefined, "not json", JSON.stringify({ decision: "maybe" })]) {
    await assert.rejects(readJson(post(body), schema, "Choose one."), (error) => error instanceof HttpError && error.status === 400 && error.message === "Choose one.");
  }
  assert.deepEqual(await readJson(post(JSON.stringify({ decision: "approved" })), schema, "Choose one."), { decision: "approved" });
});

// Routes anyone may call. Every other API route must check who is signed in before doing anything.
const PUBLIC_ROUTES = ["app/api/claims/route.ts"];

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

test("every API route calls requireAdmin or requireUser, unless it is listed as public", () => {
  const routes = routeFiles("app/api");
  assert.ok(routes.length >= 5, `found ${routes.length} routes`);
  const unguarded = routes.filter((path) => !PUBLIC_ROUTES.includes(path) && !/\brequire(Admin|User)\(\)/.test(readFileSync(path, "utf8")));
  assert.deepEqual(unguarded, [], "add requireAdmin() or requireUser() to these routes, or list them as public");
  for (const path of PUBLIC_ROUTES) assert.ok(routes.includes(path), `${path} is listed as public but does not exist`);
});
