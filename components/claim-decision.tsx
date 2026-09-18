"use client";

import { useState } from "react";

type Decision = "approved" | "rejected" | "revoked";

export function ClaimDecision({ id, status: initialStatus }: { id: string; status: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  async function decide(decision: Decision) {
    if (decision === "revoked" && !window.confirm("Revoke this claim? The owner loses access and their content is removed from the public profile.")) return;
    const response = await fetch(`/api/claims/${id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) { setMessage(null); return setStatus(decision); }
    setMessage(body.error || "Unable to update claim.");
  }
  const badge = <span className={`badge ${status === "approved" ? "badge-claimed" : "badge-unverified"}`}>{status}</span>;
  if (status === "approved") return <div className="decision-controls">{badge}<button className="btn-secondary" type="button" onClick={() => decide("revoked")}>Revoke</button>{message && <span>{message}</span>}</div>;
  if (status !== "pending") return badge;
  return <div className="decision-controls"><button className="btn-primary" type="button" onClick={() => decide("approved")}>Approve</button><button className="btn-secondary" type="button" onClick={() => decide("rejected")}>Reject</button>{message && <span>{message}</span>}</div>;
}
