"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabasePublicConfig = Boolean(url && publishableKey);

export function getBrowserSupabase() {
  if (!url || !publishableKey) throw new Error("Supabase is not configured for this deployment.");
  return createBrowserClient(url, publishableKey);
}
