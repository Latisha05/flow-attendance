import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// True when no backend is configured. The app still renders; auth/DB calls
// simply resolve to "no session" instead of crashing the whole page.
export const isSupabaseConfigured = Boolean(
  (import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
);

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!isSupabaseConfigured) {
    console.warn(
      '[Supabase] No credentials set — running in unconfigured mode. ' +
        'Auth and database calls will resolve as logged-out. ' +
        'Set SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY in .env to enable the backend.',
    );
  }

  // Fall back to a syntactically valid placeholder URL so createClient() never
  // throws; network calls against it just fail and are treated as "no session".
  return createClient<Database>(
    SUPABASE_URL || 'http://localhost:54321',
    SUPABASE_PUBLISHABLE_KEY || 'public-anon-key-not-configured',
    {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  );
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

