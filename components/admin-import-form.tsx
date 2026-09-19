"use client";

import { useState } from "react";
import type { ImportChanges } from "@/lib/imports";

type Preview = { id: string; totalRows: number; validRows: number; issues: { row: number; field?: string; message: string }[]; changes: ImportChanges | null };

export function AdminImportForm() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retirementsConfirmed, setRetirementsConfirmed] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null); setPreview(null); setRetirementsConfirmed(false);
    const response = await fetch("/api/imports", { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "The CSV could not be previewed.");
    setPreview(body);
  }

  async function publish() {
    if (!preview) return;
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/imports/${preview.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ retirements: preview.changes?.retired.length ?? 0 })
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "The import could not be published.");
    setMessage("Import published. Cached public pages have been refreshed.");
    setPreview(null);
  }

  const changes = preview?.changes;
  const retired = changes?.retired ?? [];
  const currentListings = changes ? changes.updated + changes.unchanged + retired.length : 0;

  return <div className="card admin-panel">
    <h2 className="display">Create an import preview</h2>
    <p>Upload the normalized CSV. Publishing is unavailable until all rows validate.</p>
    <form onSubmit={upload} className="upload-form"><input required accept=".csv,text/csv" name="file" type="file" /><button className="btn-primary" disabled={busy} type="submit">{busy ? "Checking…" : "Validate CSV"}</button></form>
    {message && <p className={message.startsWith("Import published") ? "form-success" : "form-error"}>{message}</p>}
    {preview && <div className="import-preview"><h3>Preview ready</h3><p>{preview.validRows} valid of {preview.totalRows} rows.</p>{preview.issues.length > 0 ? <><p className="form-error">Resolve {preview.issues.length} issue(s) before publishing.</p><ul>{preview.issues.slice(0, 10).map((issue, index) => <li key={`${issue.row}-${index}`}>Row {issue.row}: {issue.message}</li>)}</ul></> : changes && <>
      <dl className="import-changes">
        <div><dt>Added</dt><dd>{changes.added}</dd></div>
        <div><dt>Updated</dt><dd>{changes.updated}</dd></div>
        <div><dt>Unchanged</dt><dd>{changes.unchanged}</dd></div>
        <div className={retired.length ? "import-changes-retired" : undefined}><dt>Retired</dt><dd>{retired.length}</dd></div>
      </dl>
      {retired.length > 0 && <div className="import-retirements">
        <p><strong>Publishing retires {retired.length} of the {currentListings} current listings</strong> because they are not in this file. Retired listings leave search, and their profile pages show “not found”.</p>
        <ul>{retired.map((listing) => <li key={listing.license_number}>{listing.program_name}, {listing.city} ({listing.license_number})</li>)}</ul>
        <label className="check-row"><input checked={retirementsConfirmed} onChange={(event) => setRetirementsConfirmed(event.target.checked)} type="checkbox" />Retire these {retired.length} listings</label>
      </div>}
      <button className="btn-primary" disabled={busy || (retired.length > 0 && !retirementsConfirmed)} onClick={publish} type="button">{busy ? "Publishing…" : "Publish approved import"}</button>
    </>}</div>}
  </div>;
}
