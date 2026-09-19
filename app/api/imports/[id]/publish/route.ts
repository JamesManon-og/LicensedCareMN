import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { handleRoute, readJson } from "@/lib/http";
import { publishImport } from "@/lib/imports";

// The number of retirements the admin confirmed in the preview. A request without one confirms
// none, so it can only publish a file that retires nothing.
const publishSchema = z.object({ retirements: z.number().int().min(0).catch(0) }).catch({ retirements: 0 });

export const POST = handleRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { retirements } = await readJson(request, publishSchema, "");
  await publishImport(admin, (await params).id, retirements);
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/providers/[slug]", "page");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
});
