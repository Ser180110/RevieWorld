import { connection } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Whether "Accedi con Google" is switched on in Supabase (Authentication →
 * Providers → Google). Until it is, the button stays hidden.
 */
export async function googleEnabled(): Promise<boolean> {
  await connection();
  const env = supabaseEnv();
  if (!env) return false;
  try {
    const res = await fetch(`${env.url}/auth/v1/settings`, {
      headers: { apikey: env.anonKey },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
