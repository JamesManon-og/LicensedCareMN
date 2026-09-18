import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseConfig = Boolean(url && publishableKey && serviceRoleKey);

function getPublicConfig() {
  if (!url || !publishableKey) throw new Error("Supabase is not configured. Add the values in .env.local.");
  return { url, publishableKey };
}

export async function getServerSupabase() {
  const config = getPublicConfig();
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. The proxy refreshes sessions instead.
        }
      }
    }
  });
}

export function getAdminSupabase() {
  if (!url || !serviceRoleKey) throw new Error("Supabase service role credentials are not configured.");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getCurrentUser() {
  if (!hasSupabaseConfig) return null;
  const client = await getServerSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  // app_roles is not readable by anon/authenticated; the security-definer is_admin()
  // checks the role for auth.uid() of the session carried by this user-scoped client.
  const client = await getServerSupabase();
  const { data, error } = await client.rpc("is_admin");
  return !error && data === true;
}
