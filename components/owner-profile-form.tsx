"use client";

import { useState } from "react";

type Initial = { description?: string | null; website?: string | null; contact_email?: string | null; contact_phone?: string | null };

export function OwnerProfileForm({ licenseNumber, initial }: { licenseNumber: string; initial?: Initial }) {
  const [message, setMessage] = useState<string | null>(null);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/owner/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ licenseNumber, ...Object.fromEntries(new FormData(event.currentTarget)) }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Profile information saved." : body.error || "Could not save profile information.");
  }
  return <form onSubmit={save} className="owner-profile-form"><label>Short description<textarea defaultValue={initial?.description ?? ""} maxLength={1200} name="description" rows={4} /></label><label>Website<input defaultValue={initial?.website ?? ""} name="website" type="url" placeholder="https://" /></label><div className="form-two-col"><label>Preferred email<input defaultValue={initial?.contact_email ?? ""} name="contactEmail" type="email" /></label><label>Preferred phone<input defaultValue={initial?.contact_phone ?? ""} name="contactPhone" type="tel" /></label></div><button className="btn-primary" type="submit">Save provider content</button>{message && <span className="form-success">{message}</span>}</form>;
}
