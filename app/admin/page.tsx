import Link from "next/link";
import { AdminImportForm } from "@/components/admin-import-form";
import { hasSupabaseConfig, isAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!hasSupabaseConfig) return <section className="wrap page-section"><div className="card setup-card"><span className="eyebrow">Setup required</span><h1 className="display">Connect Supabase to enable operations</h1><p>The public launch directory works from its supplied snapshot. Add the Supabase environment values and run the included migration to enable imports, claim review, and owner tools.</p></div></section>;
  if (!(await isAdmin())) return <section className="wrap page-section"><div className="card setup-card"><span className="eyebrow">Administrator access</span><h1 className="display">Sign in to manage directory operations</h1><p>Only users assigned the administrator role can preview imports or review provider claims.</p><Link className="btn-primary" href="/login">Sign in</Link></div></section>;
  return <section className="wrap page-section admin-page"><div className="page-heading"><span className="eyebrow">Directory operations</span><h1 className="display">Administration</h1><p>Preview source-data updates before publishing them. Public pages stay unchanged until a valid import is approved.</p></div><div className="admin-actions"><Link className="btn-secondary" href="/admin/claims">Review provider claims</Link><Link className="btn-secondary" href="/owner">Open owner tools</Link></div><AdminImportForm /></section>;
}
