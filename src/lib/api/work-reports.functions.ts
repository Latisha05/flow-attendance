import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const getMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = todayStr();

    const [{ data: todays }, { data: history }] = await Promise.all([
      supabase
        .from("work_reports")
        .select("id, report_date, content, hours, status")
        .eq("user_id", userId)
        .eq("report_date", today)
        .maybeSingle(),
      supabase
        .from("work_reports")
        .select("id, report_date, content, hours, status")
        .eq("user_id", userId)
        .order("report_date", { ascending: false })
        .limit(30),
    ]);

    return { today: todays ?? null, history: history ?? [] };
  });

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { content: string; hours: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const content = (data.content ?? "").slice(0, 4000).trim();
    if (!content) throw new Error("Report cannot be empty");
    const hours = Math.min(24, Math.max(0, Number(data.hours) || 0));
    const report_date = todayStr();

    // Upsert today's report. A reviewed report is locked from edits.
    const { data: existing } = await supabase
      .from("work_reports")
      .select("id, status")
      .eq("user_id", userId)
      .eq("report_date", report_date)
      .maybeSingle();

    if (existing) {
      if (existing.status === "reviewed") throw new Error("Today's report was already reviewed and is locked");
      const { error } = await supabase
        .from("work_reports")
        .update({ content, hours, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("work_reports")
        .insert({ user_id: userId, report_date, content, hours, status: "pending" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
