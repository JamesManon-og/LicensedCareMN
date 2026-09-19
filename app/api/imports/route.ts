import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/http";
import { createImportPreview } from "@/lib/imports";

export const runtime = "nodejs";

export const POST = handleRoute(async (request: Request) => {
  const admin = await requireAdmin();
  const formData = await request.formData().catch(() => null);
  return NextResponse.json(await createImportPreview(admin, formData?.get("file")));
});
