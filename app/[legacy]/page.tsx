import { notFound, permanentRedirect } from "next/navigation";
import { findSnapshotProvider } from "@/lib/directory/snapshot";

export default async function LegacyRootProfilePage({ params }: { params: Promise<{ legacy: string }> }) {
  const { legacy } = await params;
  if (!legacy.endsWith(".html")) notFound();

  const slug = legacy.replace(/\.html$/, "");
  if (!findSnapshotProvider(slug)) notFound();
  permanentRedirect(`/providers/${slug}`);
}
