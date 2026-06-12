import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Working days are Mon–Sat; Sundays (getUTCDay() === 0) are not deducted.
function workingDaysBetween(start: string, end: string) {
  const a = new Date(start + "T00:00:00Z");
  const b = new Date(end + "T00:00:00Z");
  if (b < a) return 0;
  let count = 0;
  for (let d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0) count++;
  }
  return count;
}

export const getLeaveData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: requests }] = await Promise.all([
      supabase.from("profiles").select("pl_balance").eq("id", userId).single(),
      supabase
        .from("leave_requests")
        .select("id, start_date, end_date, days, reason, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      balance: Number(profile?.pl_balance ?? 0),
      requests: requests ?? [],
    };
  });

export const requestLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { start_date: string; end_date: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const days = workingDaysBetween(data.start_date, data.end_date);
    if (days < 1) throw new Error("Select a valid date range");

    // Reject requests that exceed available paid-leave balance.
    const { data: profile } = await supabase
      .from("profiles")
      .select("pl_balance")
      .eq("id", userId)
      .single();
    if (days > Number(profile?.pl_balance ?? 0)) {
      throw new Error(`Not enough leave balance (${Number(profile?.pl_balance ?? 0)} PL available, ${days} requested)`);
    }

    const { error } = await supabase.from("leave_requests").insert({
      user_id: userId,
      start_date: data.start_date,
      end_date: data.end_date,
      days,
      reason: data.reason.slice(0, 500),
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminOps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: present }, { data: punchedToday }, { data: pending }, { data: onLeave }, { data: allProfiles }] = await Promise.all([
      // Currently punched in (open session) — the live "present" count.
      supabase
        .from("attendance")
        .select("user_id")
        .is("punch_out_at", null)
        .gte("punch_in_at", startOfDay.toISOString()),
      // Anyone who punched in today at all (present-or-done) for roster status.
      supabase
        .from("attendance")
        .select("user_id")
        .gte("punch_in_at", startOfDay.toISOString()),
      supabase
        .from("leave_requests")
        .select("id, user_id, start_date, end_date, days, reason, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("leave_requests")
        .select("user_id")
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today),
      supabase.from("profiles").select("id, full_name"),
    ]);

    const nameMap = new Map((allProfiles ?? []).map((p) => [p.id, p.full_name]));
    const presentSet = new Set((present ?? []).map((r) => r.user_id)); // currently in
    const punchedSet = new Set((punchedToday ?? []).map((r) => r.user_id)); // in or already done
    const onLeaveSet = new Set((onLeave ?? []).map((r) => r.user_id));

    return {
      counts: {
        present: presentSet.size,
        onLeave: onLeaveSet.size,
        total: (allProfiles ?? []).length,
      },
      pending: (pending ?? []).map((r) => ({ ...r, name: nameMap.get(r.user_id) ?? "Unknown" })),
      roster: (allProfiles ?? []).map((p) => ({
        id: p.id,
        name: p.full_name,
        status: presentSet.has(p.id)
          ? "present"
          : onLeaveSet.has(p.id)
            ? "leave"
            : punchedSet.has(p.id)
              ? "done"
              : "absent",
      })),
    };
  });

export const decideLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; approve: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Forbidden");

    const status = data.approve ? "approved" : "declined";
    const { data: req, error: fetchErr } = await supabase
      .from("leave_requests")
      .select("user_id, days, status")
      .eq("id", data.id)
      .single();
    if (fetchErr || !req) throw new Error("Not found");
    if (req.status !== "pending") throw new Error("Already decided");

    const { error } = await supabase
      .from("leave_requests")
      .update({ status, decided_by: userId, decided_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.approve) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("pl_balance")
        .eq("id", req.user_id)
        .single();
      const newBal = Math.max(0, Number(prof?.pl_balance ?? 0) - Number(req.days));
      await supabase.from("profiles").update({ pl_balance: newBal }).eq("id", req.user_id);
    }
    return { ok: true };
  });