import { permanentRedirect } from "next/navigation";

export default async function LegacyProfilePage({ params }: { params: Promise<{ legacy: string }> }) {
  const { legacy } = await params;
  permanentRedirect(`/providers/${legacy.replace(/\.html$/, "")}`);
}
