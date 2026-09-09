import { notFound, redirect } from "next/navigation";
import { getProvider } from "@/lib/locations";

export default async function LegacyRootProfilePage({ params }: { params: Promise<{ legacy: string }> }) {
  const { legacy } = await params;
  if (!legacy.endsWith(".html")) notFound();

  const slug = legacy.replace(/\.html$/, "");
  if (!getProvider(slug)) notFound();
  redirect(`/providers/${slug}`);
}
