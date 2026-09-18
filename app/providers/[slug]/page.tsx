import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/claim-form";
import { ProviderCard } from "@/components/provider-card";
import { StatusBadge } from "@/components/status-badge";
import { dhsLicenseUrl, mapsUrl, searchByCountyHref, searchByTagHref, searchByTextHref } from "@/lib/links";
import { formatPhone, getAllLocations, getDirectoryProvider, getDirectoryRelatedProviders, STATUS_EXPLANATION } from "@/lib/locations";
import { getClaimedLicenses, getOwnerContent } from "@/lib/owner-content";
import { hasSupabaseConfig } from "@/lib/supabase";
import { initials } from "@/lib/text";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllLocations().map((location) => ({ slug: location.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getDirectoryProvider(slug);
  if (!provider) return { title: "Provider not found" };
  return {
    title: provider.program_name,
    description: `${provider.program_name} in ${provider.city}, ${provider.county} County. View the launch-directory license record and listed contact details.`
  };
}

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params;
  const provider = await getDirectoryProvider(slug);
  if (!provider) notFound();
  const [related, ownerContent] = await Promise.all([getDirectoryRelatedProviders(provider), getOwnerContent(provider.license_number)]);
  const claimed = await getClaimedLicenses([provider, ...related].map((location) => location.license_number));
  const phoneHref = provider.phone?.replace(/[^\d+]/g, "");
  return (
    <section className="wrap page-section provider-page">
      <Link className="back-link" href="/search">← Back to provider search</Link>
      <div className="provider-hero card">
        <div className="provider-avatar">{initials(provider.program_name)}</div>
        <div className="provider-heading"><span className="eyebrow">DHS-sourced launch record</span><h1 className="display">{provider.program_name}</h1><p>{provider.company}</p><div className="bcard-tags"><StatusBadge status={provider.status_class} />{claimed.has(provider.license_number) ? <span className="badge badge-claimed">Claimed listing</span> : <span className="badge badge-unverified">Unclaimed listing</span>}</div></div>
      </div>
      <div className="provider-layout">
        <div>
          <section className="card detail-card"><h2 className="display">License record</h2><dl className="detail-list"><div><dt>Listed status</dt><dd><StatusBadge status={provider.status_class} /> <span>{provider.license_status}</span></dd></div><div><dt>License number</dt><dd><a href={dhsLicenseUrl(provider.license_number)} target="_blank" rel="noopener noreferrer">{provider.license_number} <span aria-hidden="true">↗</span><span className="sr-only"> (view on Minnesota DHS Licensing Lookup, opens in a new tab)</span></a></dd></div><div><dt>Service types</dt><dd className="tag-list">{provider.tags.map((tag) => <Link className="svctag" href={searchByTagHref(tag)} key={tag}>{tag}</Link>)}</dd></div></dl><p className="status-note">{STATUS_EXPLANATION[provider.status_class]} This is a launch snapshot; confirm current status directly with Minnesota DHS.</p></section>
          <section className="card detail-card"><h2 className="display">Listed contact details</h2><dl className="detail-list"><div><dt>Address</dt><dd><a href={mapsUrl(provider)} target="_blank" rel="noopener noreferrer">{provider.address}<br />{provider.city}, MN {provider.zip} <span aria-hidden="true">↗</span><span className="sr-only"> (open in Google Maps, opens in a new tab)</span></a><br /><Link href={searchByTextHref(provider.city)}>More in {provider.city}</Link> · <Link href={searchByCountyHref(provider.county)}>{provider.county} County</Link></dd></div><div><dt>Phone</dt><dd>{phoneHref ? <a href={`tel:${phoneHref}`}>{formatPhone(provider.phone)}</a> : "Phone not listed"}</dd></div></dl></section>
          {ownerContent && <section className="card detail-card"><span className="eyebrow">Provider-supplied content</span><h2 className="display">From the provider</h2>{ownerContent.description && <p>{ownerContent.description}</p>}<dl className="detail-list">{ownerContent.website && <div><dt>Website</dt><dd><a href={ownerContent.website} rel="noreferrer">{ownerContent.website}</a></dd></div>}{ownerContent.contact_email && <div><dt>Preferred email</dt><dd><a href={`mailto:${ownerContent.contact_email}`}>{ownerContent.contact_email}</a></dd></div>}{ownerContent.contact_phone && <div><dt>Preferred phone</dt><dd><a href={`tel:${ownerContent.contact_phone.replace(/[^\d+]/g, "")}`}>{ownerContent.contact_phone}</a></dd></div>}</dl></section>}
          <ClaimForm provider={provider} enabled={hasSupabaseConfig} />
        </div>
        <aside className="provider-aside"><div className="snapshot-notice"><strong>Verify before deciding</strong><p>Contact Minnesota DHS or the provider directly for current license, services, and availability information.</p><Link className="btn-secondary" href="/guide">Read the CRS guide</Link></div></aside>
      </div>
      {related.length > 0 && <section className="related-section"><h2 className="display">Related providers</h2><div className="results-list">{related.map((location) => <ProviderCard key={location.license_number} location={location} claimed={claimed.has(location.license_number)} />)}</div></section>}
    </section>
  );
}
