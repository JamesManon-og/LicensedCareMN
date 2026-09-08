"use client";

import { useState } from "react";

export function ClaimDecision({ id, status }: { id: string; status: string }) {
  const [message, setMessage] = useState<string | null>(null);
  if (status !== "pending") return <span className={`badge ${status === "approved" ? "badge-claimed" : "badge-unverified"}`}>{status}</span>;
  async function decide(decision: "approved" | "rejected") {
    const response = await fetch(`/api/claims/${id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Claim ${decision}.` : body.error || "Unable to update claim.");
  }
  return <div className="decision-controls"><button className="btn-primary" type="button" onClick={() => decide("approved")}>Approve</button><button className="btn-secondary" type="button" onClick={() => decide("rejected")}>Reject</button>{message && <span>{message}</span>}</div>;
}
