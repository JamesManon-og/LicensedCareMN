import Link from "next/link";
import { ClaimDecision } from "@/components/claim-decision";
import { getActor } from "@/lib/auth";
import { listClaims } from "@/lib/claims";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review claims", robots: { index: false, follow: false } };

export default async function AdminClaimsPage() {
  const { admin } = await getActor();
  if (!admin) return <section className="wrap page-section"><div className="card setup-card"><h1 className="display">Administrator access required</h1><Link className="btn-primary" href="/admin">Return to administration</Link></div></section>;
  const claims = await listClaims(admin);
  return <section className="wrap page-section admin-page"><div className="page-heading"><span className="eyebrow">Provider verification</span><h1 className="display">Claim review queue</h1><p>Approve only representatives whose authorization has been verified outside this application.</p></div><div className="claim-queue">{claims.length ? claims.map((claim) => <article className="card claim-review" key={claim.id}><div><strong>{claim.claimant_name}</strong><p>{claim.claimant_role} · {claim.claimant_email}{claim.claimant_phone ? ` · ${claim.claimant_phone}` : ""}</p><p>License {claim.license_number} · submitted {new Date(claim.created_at).toLocaleDateString()}</p>{claim.message && <blockquote>{claim.message}</blockquote>}</div><ClaimDecision id={claim.id} status={claim.status} /></article>) : <div className="empty-state card">There are no claim requests to review.</div>}</div></section>;
}
