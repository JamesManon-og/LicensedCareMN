import Link from "next/link";
import { OwnerProfileForm } from "@/components/owner-profile-form";
import { SignOutButton } from "@/components/sign-out-button";
import { directory } from "@/lib/directory";
import { normalizeEmail } from "@/lib/owner-input";
import { getAdminSupabase, getCurrentUser, hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner tools", robots: { index: false, follow: false } };

export default async function OwnerPage() {
  if (!hasSupabaseConfig) return <section className="wrap page-section"><div className="card setup-card"><span className="eyebrow">Setup required</span><h1 className="display">Owner tools are not connected yet</h1><p>Apply the Supabase migration and environment configuration to enable verified owner access.</p></div></section>;
  const user = await getCurrentUser();
  if (!user?.email) return <section className="wrap page-section"><div className="card setup-card"><h1 className="display">Sign in to manage a claimed listing</h1><p>Use the same work email that was approved in your provider claim.</p><Link className="btn-primary" href="/login?next=/owner">Sign in</Link></div></section>;
  const client = getAdminSupabase();
  const { data: claims } = await client.from("provider_claims").select("license_number").eq("claimant_email", normalizeEmail(user.email)).eq("status", "approved");
  // A listing claimed (and approved) more than once is still managed from one form.
  const licenses = [...new Set(claims?.map((claim) => claim.license_number) ?? [])];
  const providers = await Promise.all(licenses.map((license) => directory.getByLicense(license)));
  const { data: profiles } = licenses.length ? await client.from("provider_profiles").select("license_number, description, website, contact_email, contact_phone").in("license_number", licenses) : { data: [] };
  const profilesByLicense = new Map((profiles ?? []).map((profile) => [profile.license_number, profile]));
  return <section className="wrap page-section owner-page"><div className="page-heading"><span className="eyebrow">Verified owner tools</span><h1 className="display">Manage provider-supplied information</h1><p>DHS-sourced license facts remain protected. Changes here are limited to optional public profile content.</p></div><div className="admin-actions"><SignOutButton /></div>{licenses.length ? <div className="owner-list">{licenses.map((license, index) => { const provider = providers[index]; const profile = profilesByLicense.get(license); return provider ? <article className="card owner-card" key={license}><div><span className="eyebrow">Approved claim</span><h2 className="display">{provider.program_name}</h2><p>{provider.city}, {provider.county} County · License {license}</p></div><OwnerProfileForm licenseNumber={license} initial={profile ?? undefined} /></article> : null; })}</div> : <div className="empty-state card"><h2>No approved listings yet</h2><p>Once an administrator approves a claim submitted with this email address, it will appear here.</p></div>}</section>;
}
