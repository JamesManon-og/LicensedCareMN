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
 */
export async function getActor(): Promise<{ user: Actor | null; admin: AdminActor | null }> {
  if (!hasSupabaseConfig) return { user: null, admin: null };
  const client = await getServerSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email) return { user: null, admin: null };
  const user = { id: data.user.id, email: data.user.email };
  // app_roles is not readable by anon/authenticated; the security-definer is_admin() checks the
  // role for auth.uid() of the session this client carries.
  const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
  return { user, admin: !roleError && isAdmin === true ? { ...user, role: "admin" } : null };
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
