import Link from "next/link";
import { AdminImportForm } from "@/components/admin-import-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getActor } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!hasSupabaseConfig) return <section className="wrap page-section"><div className="card setup-card"><span className="eyebrow">Setup required</span><h1 className="display">Connect Supabase to enable operations</h1><p>The public launch directory works from its supplied snapshot. Add the Supabase environment values and run the included migration to enable imports, claim review, and owner tools.</p></div></section>;
  const { user, admin } = await getActor();
  if (!user) return <section className="wrap page-section"><div className="card setup-card"><span className="eyebrow">Administrator access</span><h1 className="display">Sign in to manage directory operations</h1><p>Only users assigned the administrator role can preview imports or review provider claims.</p><Link className="btn-primary" href="/login?next=/admin">Sign in</Link></div></section>;
  if (!admin) return <section className="wrap page-section"><div className="card setup-card"><span className="eyebrow">Administrator access</span><h1 className="display">This account is not an administrator</h1><p>You are signed in as {user.email}. Provider owners can manage approved listings from owner tools.</p><div className="admin-actions"><Link className="btn-primary" href="/owner">Open owner tools</Link><SignOutButton /></div></div></section>;
  return <section className="wrap page-section admin-page"><div className="page-heading"><span className="eyebrow">Directory operations</span><h1 className="display">Administration</h1><p>Preview source-data updates before publishing them. Public pages stay unchanged until a valid import is approved.</p></div><div className="admin-actions"><Link className="btn-secondary" href="/admin/claims">Review provider claims</Link><Link className="btn-secondary" href="/owner">Open owner tools</Link><SignOutButton /></div><AdminImportForm /></section>;
}
