import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatPhone } from "@/lib/locations";
import type { ProviderLocation } from "@/lib/types";

export function ProviderCard({ location }: { location: ProviderLocation }) {
  const phoneHref = location.phone?.replace(/[^\d+]/g, "");
  return (
    <article className="bcard">
      <div className="avatar-init" aria-hidden="true">{location.program_name.slice(0, 2).toUpperCase()}</div>
      <div className="provider-card-body">
        <h2 className="bcard-title">{location.program_name}</h2>
        <p className="bcard-meta">{location.tags.slice(0, 2).join(" · ")} · {location.city}, {location.county} County</p>
        <div className="bcard-tags">
          <span className="badge badge-dhs">DHS-sourced record</span>
          <StatusBadge status={location.status_class} />
          <span className="badge badge-unverified">Unclaimed</span>
        </div>
        <div className="bcard-cta">
          <Link className="btn-primary" href={`/providers/${location.slug}`}>View profile</Link>
          {phoneHref ? <a className="btn-secondary" href={`tel:${phoneHref}`}>{formatPhone(location.phone)}</a> : <span className="btn-secondary disabled-control">Phone not listed</span>}
        </div>
      </div>
    </article>
  );
}
