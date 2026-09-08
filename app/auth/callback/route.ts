import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/admin";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !code) return NextResponse.redirect(new URL("/login", request.url));

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.headers.get("cookie")?.split(";").map((entry) => {
          const [name, ...value] = entry.trim().split("=");
          return { name, value: value.join("=") };
        }) ?? [];
      },
      setAll(items) { items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); }
    }
  });
  await supabase.auth.exchangeCodeForSession(code);
  return response;
}
