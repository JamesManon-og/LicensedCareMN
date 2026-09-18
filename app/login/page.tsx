"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveNextPath } from "@/lib/auth-redirect";
import { getBrowserSupabase, hasSupabasePublicConfig } from "@/lib/supabase-client";

function LoginForm() {
  const nextPath = resolveNextPath(useSearchParams().get("next"));
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const { error } = await getBrowserSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` } });
    setMessage(error ? error.message : "Check your email for a secure sign-in link.");
  }
  return <><form onSubmit={submit}><label>Work email<input type="email" name="email" required autoComplete="email" /></label><button className="btn-primary" type="submit">Email me a sign-in link</button></form>{message && <p className="form-success">{message}</p>}</>;
}

export default function LoginPage() {
  return <section className="wrap page-section auth-page"><div className="card auth-card"><span className="eyebrow">Administrators and verified owners</span><h1 className="display">Sign in</h1>{!hasSupabasePublicConfig ? <p className="form-error">Sign-in has not been configured for this deployment.</p> : <Suspense fallback={<p>Loading sign-in…</p>}><LoginForm /></Suspense>}</div></section>;
}
