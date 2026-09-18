export const DEFAULT_AFTER_LOGIN_PATH = "/admin";

// Post-login redirects may only target a path on this site. Anything a URL parser
// could resolve to another origin ("https://…", "//host", "/\host") or that is not
// rooted at "/" ("javascript:…", "admin") falls back to a safe default.
export function resolveNextPath(next: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN_PATH) {
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
