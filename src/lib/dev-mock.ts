// Dev-only flag. Lets the app render its authenticated/admin screens (with empty
// states) when NO backend is configured, so the UI can be reviewed locally.
// Never active in production builds or when Supabase creds are set.

const hasCreds = Boolean(
  (import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
);

// import.meta.env.DEV is true under `vite dev`, false in production builds.
export const DEV_BYPASS = import.meta.env.DEV && !hasCreds;
