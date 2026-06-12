import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name, pl_balance").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    // Open punch (no punch_out_at)
    const { data: open } = await supabase
      .from("attendance")
      .select("id, punch_in_at, in_lat, in_lng")
      .eq("user_id", userId)
      .is("punch_out_at", null)
      .order("punch_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Today's completed punches
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: today } = await supabase
      .from("attendance")
      .select("net_seconds, punch_in_at, punch_out_at")
      .eq("user_id", userId)
      .gte("punch_in_at", startOfDay.toISOString())
      .order("punch_in_at", { ascending: true });

    // Last 7 days
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const { data: week } = await supabase
      .from("attendance")
      .select("net_seconds, punch_in_at")
      .eq("user_id", userId)
      .gte("punch_in_at", weekStart.toISOString());

    return {
      profile: profile ?? { full_name: "", pl_balance: 0 },
      isAdmin,
      open,
      today: today ?? [],
      week: week ?? [],
    };
  });

export const punchIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { lat?: number | null; lng?: number | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // One punch pair per day: reject a second punch-in on the same calendar day.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: already } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", userId)
      .gte("punch_in_at", startOfDay.toISOString())
      .limit(1)
      .maybeSingle();
    if (already) throw new Error("Already punched in today");

    const { data: row, error } = await supabase
      .from("attendance")
      .insert({ user_id: userId, in_lat: data.lat ?? null, in_lng: data.lng ?? null })
      .select("id, punch_in_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getAttendanceMonth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { year: number; month: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = new Date(Date.UTC(data.year, data.month, 1));
    const end = new Date(Date.UTC(data.year, data.month + 1, 1));
    const { data: rows, error } = await supabase
      .from("attendance")
      .select("punch_in_at, punch_out_at, net_seconds")
      .eq("user_id", userId)
      .gte("punch_in_at", start.toISOString())
      .lt("punch_in_at", end.toISOString())
      .order("punch_in_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const punchOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; lat?: number | null; lng?: number | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("attendance")
      .select("punch_in_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (!existing) throw new Error("Punch not found");
    const now = new Date();
    const inAt = new Date(existing.punch_in_at);
    const elapsed = Math.max(0, Math.floor((now.getTime() - inAt.getTime()) / 1000));
    // Subtract a 1-hour break if elapsed >= 5h, so 9h logged = 8h net
    const net = elapsed >= 5 * 3600 ? elapsed - 3600 : elapsed;
    const { error } = await supabase
      .from("attendance")
      .update({
        punch_out_at: now.toISOString(),
        out_lat: data.lat ?? null,
        out_lng: data.lng ?? null,
        net_seconds: net,
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });