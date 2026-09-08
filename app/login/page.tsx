"use client";

import { useState } from "react";
import { getBrowserSupabase, hasSupabasePublicConfig } from "@/lib/supabase-client";

export default function LoginPage() {
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const { error } = await getBrowserSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` } });
    setMessage(error ? error.message : "Check your email for a secure sign-in link.");
  }
  return <section className="wrap page-section auth-page"><div className="card auth-card"><span className="eyebrow">Administrator access</span><h1 className="display">Sign in</h1>{!hasSupabasePublicConfig ? <p className="form-error">Administrator authentication has not been configured for this deployment.</p> : <form onSubmit={submit}><label>Work email<input type="email" name="email" required autoComplete="email" /></label><button className="btn-primary" type="submit">Email me a sign-in link</button></form>}{message && <p className="form-success">{message}</p>}</div></section>;
}
