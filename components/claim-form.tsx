"use client";

import { useState } from "react";
import type { ProviderLocation } from "@/lib/types";

type State = { kind: "idle" | "success" | "error"; message?: string };

export function ClaimForm({ provider, enabled }: { provider: ProviderLocation; enabled: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "idle" });
    const form = event.currentTarget;
    const response = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setState({ kind: "error", message: body.error || "Your request could not be sent." });
    form.reset();
    setState({ kind: "success", message: "Thanks. An administrator will review your claim request." });
  }

  return (
    <section className="card detail-card claim-card">
      <span className="eyebrow">For provider representatives</span>
      <h2 className="display">Claim this listing</h2>
      <p>Claims are reviewed before any provider-supplied information appears publicly. DHS licensing facts cannot be changed through this form.</p>
      {!enabled ? <p>Claim requests are not open on this deployment yet.</p> : state.kind === "success" ? <p className="form-success" role="status">{state.message}</p> : <form onSubmit={submit} className="claim-form">
        <input type="hidden" name="licenseNumber" value={provider.license_number} />
        <label>Full name<input required name="name" autoComplete="name" /></label>
        <label>Work email<input required name="email" type="email" autoComplete="email" /></label>
        <label>Role / relationship<input required name="role" placeholder="Owner, administrator, authorized representative…" /></label>
        <label>Work phone <input name="phone" type="tel" autoComplete="tel" /></label>
        <label>Verification note <textarea name="message" rows={3} placeholder="Tell us how you are authorized to represent this provider." /></label>
        <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        {state.kind === "error" && <p className="form-error" role="alert">{state.message}</p>}
        <button className="btn-primary" type="submit">Send claim request</button>
      </form>}
    </section>
  );
}
