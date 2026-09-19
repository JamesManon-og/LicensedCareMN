import { HttpError } from "@/lib/http";
import { getServerSupabase, hasSupabaseConfig } from "@/lib/supabase";

/** A signed-in user. */
export type Actor = { id: string; email: string };
/** A signed-in administrator. Only getActor and requireAdmin create one, so a plain Actor cannot stand in for it. */
export type AdminActor = Actor & { role: "admin" };

/**
 * The signed-in user from the session cookies, and the same user as an AdminActor when they hold the
 * admin role. One session check and one role check, on one client. Every sign-in is by email link,
 * so a user without an email is treated as signed out.
 *
 * Only an answer from Supabase Auth that the session is missing or invalid (a 4xx) means signed
 * out. A network failure (status 0) or a 5xx throws, as does a failed role check, so an outage is
 * not shown as "sign in" or "this account is not an administrator".
 */
export async function getActor(): Promise<{ user: Actor | null; admin: AdminActor | null }> {
  if (!hasSupabaseConfig) return { user: null, admin: null };
  const client = await getServerSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (isSignedOut(error.status)) return { user: null, admin: null };
    throw new Error(`Session check failed: ${error.message}`);
  }
  if (!data.user.email) return { user: null, admin: null };
  const user = { id: data.user.id, email: data.user.email };
  // app_roles is not readable by anon/authenticated; the security-definer is_admin() checks the
  // role for auth.uid() of the session this client carries.
  const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
  if (roleError) throw new Error(`Administrator role check failed: ${roleError.message}`);
  return { user, admin: isAdmin === true ? { ...user, role: "admin" } : null };
}

/** Whether a Supabase Auth error status means the request has no valid session. */
export function isSignedOut(status: number | undefined) {
  return status !== undefined && status >= 400 && status < 500;
}

/** The signed-in user; a 401 when nobody is signed in. */
export async function requireUser() {
  const { user } = await getActor();
  if (!user) throw new HttpError(401, "Sign in with the approved work email first.");
  return user;
}

/** The signed-in administrator; a 403 for anyone else, signed in or not. */
export async function requireAdmin() {
  const { admin } = await getActor();
  if (!admin) throw new HttpError(403, "Administrator access is required.");
  return admin;
}
