/** Claim emails are stored normalized, so a signed-in owner's email must be normalized the same way before matching. */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Owner-supplied websites are rendered as links, so only http(s) URLs are allowed (never javascript: or data:). */
export function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
