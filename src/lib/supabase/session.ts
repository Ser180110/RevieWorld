import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth session and writes updated cookies on the
 * response. Skipped when Supabase is not configured yet (local first run).
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const env = supabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Do not remove: refreshes an expired access token. getClaims() verifies the
  // JWT locally, so most requests make no network call to Supabase Auth.
  await supabase.auth.getClaims();
  return response;
}
