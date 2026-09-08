"use client";

import { useState } from "react";

type Preview = { id: string; totalRows: number; validRows: number; issues: { row: number; field?: string; message: string }[] };

export function AdminImportForm() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null); setPreview(null);
    const response = await fetch("/api/imports", { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "The CSV could not be previewed.");
    setPreview(body);
  }

  async function publish() {
    if (!preview) return;
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/imports/${preview.id}/publish`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "The import could not be published.");
    setMessage("Import published. Cached public pages have been refreshed.");
    setPreview(null);
  }

  return <div className="card admin-panel">
    <h2 className="display">Create an import preview</h2>
    <p>Upload the normalized CSV. Publishing is unavailable until all rows validate.</p>
    <form onSubmit={upload} className="upload-form"><input required accept=".csv,text/csv" name="file" type="file" /><button className="btn-primary" disabled={busy} type="submit">{busy ? "Checking…" : "Validate CSV"}</button></form>
    {message && <p className={message.startsWith("Import published") ? "form-success" : "form-error"}>{message}</p>}
    {preview && <div className="import-preview"><h3>Preview ready</h3><p>{preview.validRows} valid of {preview.totalRows} rows.</p>{preview.issues.length > 0 ? <><p className="form-error">Resolve {preview.issues.length} issue(s) before publishing.</p><ul>{preview.issues.slice(0, 10).map((issue, index) => <li key={`${issue.row}-${index}`}>Row {issue.row}: {issue.message}</li>)}</ul></> : <button className="btn-primary" disabled={busy} onClick={publish} type="button">{busy ? "Publishing…" : "Publish approved import"}</button>}</div>}
  </div>;
}
