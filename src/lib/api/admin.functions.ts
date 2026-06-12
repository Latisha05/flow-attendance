import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Loosely typed to match the client instance provided by requireSupabaseAuth's
// context regardless of how its generics are inferred.
async function assertAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Forbidden");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Employees -------------------------------------------------------------

export const getEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [{ data: profiles }, { data: roles }, { data: openToday }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, pl_balance, created_at").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("attendance")
        .select("user_id, punch_out_at")
        .gte("punch_in_at", startOfDay.toISOString()),
    ]);

    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) roleMap.set(r.user_id, r.role);
    const punchedIn = new Set((openToday ?? []).filter((a) => !a.punch_out_at).map((a) => a.user_id));
    const punchedToday = new Set((openToday ?? []).map((a) => a.user_id));

    return {
      employees: (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        pl_balance: Number(p.pl_balance),
        role: roleMap.get(p.id) ?? "employee",
        created_at: p.created_at,
        todayStatus: punchedIn.has(p.id) ? "present" : punchedToday.has(p.id) ? "done" : "absent",
      })),
    };
  });

export const setPlBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string; balance: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const balance = Math.max(0, Math.min(999, Number(data.balance) || 0));
    const { error } = await supabase
      .from("profiles")
      .update({ pl_balance: balance })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string; role: "admin" | "employee" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.userId === userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin role");
    }
    // user_roles has UNIQUE(user_id, role); a user holds one row here.
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Attendance correction -------------------------------------------------

export const getEmployeeMonth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string; year: number; month: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const start = new Date(Date.UTC(data.year, data.month, 1));
    const end = new Date(Date.UTC(data.year, data.month + 1, 1));
    const { data: rows } = await supabase
      .from("attendance")
      .select("id, punch_in_at, punch_out_at, net_seconds")
      .eq("user_id", data.userId)
      .gte("punch_in_at", start.toISOString())
      .lt("punch_in_at", end.toISOString())
      .order("punch_in_at", { ascending: true });
    return { rows: rows ?? [] };
  });

export const correctPunch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; punch_in_at: string; punch_out_at: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const inAt = new Date(data.punch_in_at);
    if (isNaN(inAt.getTime())) throw new Error("Invalid punch-in time");
    let net: number | null = null;
    let outIso: string | null = null;
    if (data.punch_out_at) {
      const outAt = new Date(data.punch_out_at);
      if (isNaN(outAt.getTime())) throw new Error("Invalid punch-out time");
      if (outAt <= inAt) throw new Error("Punch-out must be after punch-in");
      const elapsed = Math.floor((outAt.getTime() - inAt.getTime()) / 1000);
      net = elapsed >= 5 * 3600 ? elapsed - 3600 : elapsed; // same 1h break rule as punchOut
      outIso = outAt.toISOString();
    }

    const { error } = await supabase
      .from("attendance")
      .update({ punch_in_at: inAt.toISOString(), punch_out_at: outIso, net_seconds: net })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Work reports review ---------------------------------------------------

export const getAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { date?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const date = data?.date || todayStr();

    const [{ data: reports }, { data: profiles }] = await Promise.all([
      supabase
        .from("work_reports")
        .select("id, user_id, report_date, content, hours, status")
        .eq("report_date", date)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, full_name"),
    ]);

    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return {
      date,
      reports: (reports ?? []).map((r) => ({ ...r, name: nameMap.get(r.user_id) ?? "Unknown" })),
    };
  });

export const reviewReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("work_reports")
      .update({ status: "reviewed", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
