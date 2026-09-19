import Link from "next/link";
import { OwnerProfileForm } from "@/components/owner-profile-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getActor } from "@/lib/auth";
import { getOwnerListings } from "@/lib/owner";
import { hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner tools", robots: { index: false, follow: false } };

export default async function OwnerPage() {
  if (!hasSupabaseConfig) return <section className="wrap page-section"><div className="card setup-card"><span className="eyebrow">Setup required</span><h1 className="display">Owner tools are not connected yet</h1><p>Apply the Supabase migration and environment configuration to enable verified owner access.</p></div></section>;
  const { user } = await getActor();
  if (!user) return <section className="wrap page-section"><div className="card setup-card"><h1 className="display">Sign in to manage a claimed listing</h1><p>Use the same work email that was approved in your provider claim.</p><Link className="btn-primary" href="/login?next=/owner">Sign in</Link></div></section>;
  const listings = await getOwnerListings(user);
  return <section className="wrap page-section owner-page"><div className="page-heading"><span className="eyebrow">Verified owner tools</span><h1 className="display">Manage provider-supplied information</h1><p>DHS-sourced license facts remain protected. Changes here are limited to optional public profile content.</p></div><div className="admin-actions"><SignOutButton /></div>{listings.length ? <div className="owner-list">{listings.map(({ provider, profile }) => <article className="card owner-card" key={provider.license_number}><div><span className="eyebrow">Approved claim</span><h2 className="display">{provider.program_name}</h2><p>{provider.city}, {provider.county} County · License {provider.license_number}</p></div><OwnerProfileForm licenseNumber={provider.license_number} initial={profile ?? undefined} /></article>)}</div> : <div className="empty-state card"><h2>No approved listings yet</h2><p>Once an administrator approves a claim submitted with this email address, it will appear here.</p></div>}</section>;
}
