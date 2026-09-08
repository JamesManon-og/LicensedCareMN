import { redirect } from "next/navigation";

export default async function LegacyProfilePage({ params }: { params: Promise<{ legacy: string }> }) {
  const { legacy } = await params;
  redirect(`/providers/${legacy.replace(/\.html$/, "")}`);
}
