import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { decideClaim } from "@/lib/claims";
import { handleRoute, readJson } from "@/lib/http";

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected", "revoked"]) });

export const POST = handleRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { decision } = await readJson(request, decisionSchema, "Choose approve, reject, or revoke.");
  const slug = await decideClaim(admin, (await params).id, decision);
  // The profile shows the listing's claimed badge and, while approved, its provider content.
  if (slug) revalidatePath(`/providers/${slug}`);
  return NextResponse.json({ ok: true });
});
