import { NextResponse } from "next/server";
import { claimSchema, submitClaim } from "@/lib/claims";
import { handleRoute, readJson } from "@/lib/http";

// Public: anyone may ask to claim a listing. An administrator approves the claim separately.
export const POST = handleRoute(async (request: Request) => {
  const input = await readJson(request, claimSchema, "Please provide a valid name, work email, and relationship to the provider.");
  await submitClaim(input);
  return NextResponse.json({ ok: true });
});
