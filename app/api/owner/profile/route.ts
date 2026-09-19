import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRoute, HttpError, readJson } from "@/lib/http";
import { ownerProfileSchema, saveOwnerProfile } from "@/lib/owner";
import { hasSupabaseConfig } from "@/lib/supabase";

export const PUT = handleRoute(async (request: Request) => {
  if (!hasSupabaseConfig) throw new HttpError(503, "Owner tools are not configured for this deployment.");
  const user = await requireUser();
  const input = await readJson(request, ownerProfileSchema, "Review the website, email, and content fields.");
  const slug = await saveOwnerProfile(user, input);
  if (slug) revalidatePath(`/providers/${slug}`);
  return NextResponse.json({ ok: true });
});
