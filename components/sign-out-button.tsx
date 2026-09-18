"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    await getBrowserSupabase().auth.signOut();
    // Full navigation so server components re-render without the session cookies.
    window.location.assign("/");
  }
  return <button className="btn-secondary" type="button" onClick={signOut} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>;
}
