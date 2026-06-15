import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { getEmployees, getEmployeeMonth } from "@/lib/store";

export const Route = createFileRoute("/admin/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Admin" }] }),
  component: AttendancePage,
});

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function AttendancePage() {
  const now = new Date();
  const [userId, setUserId] = useState<string>("");
  const [year] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: empData } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => getEmployees(),
  });
  const employees = empData?.employees ?? [];

  // Default to first employee once loaded.
  useEffect(() => {
    if (!userId && employees.length) setUserId(employees[0].id);
  }, [employees, userId]);

  const { data } = useQuery({
    queryKey: ["admin-month", userId, year, month],
    queryFn: () => getEmployeeMonth(userId, year, month),
    enabled: !!userId,
  });

  const rows = data?.rows ?? [];
  const totalHours = rows.reduce((a, r) => a + (r.net_seconds ?? 0) / 3600, 0);
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const empName = employees.find((e) => e.id === userId)?.full_name || "employee";

  function exportCsv() {
    const header = ["Date", "Punch in", "Punch out", "Net hours"];
    const lines = rows.map((r) => [
      new Date(r.punch_in_at).toLocaleDateString(),
      fmtTime(r.punch_in_at),
      fmtTime(r.punch_out_at),
      ((r.net_seconds ?? 0) / 3600).toFixed(2),
    ]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${empName.replace(/\s+/g, "-")}-${year}-${String(month + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold mb-6">Attendance</h1>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Employee</span>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="mt-1 block h-11 px-3 rounded-xl bg-white border border-border min-w-[200px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name || "Unnamed"}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => m - 1)} className="h-11 px-3 rounded-xl border border-border font-semibold hover:bg-muted hover:border-primary/40 transition-all">
            ‹
          </button>
          <span className="text-sm font-bold w-32 text-center">{monthLabel}</span>
          <button
            onClick={() => setMonth((m) => (year < now.getFullYear() || m < now.getMonth() ? m + 1 : m))}
            className="h-11 px-3 rounded-xl border border-border font-semibold hover:bg-muted"
          >
            ›
          </button>
        </div>

        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="h-11 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40 ml-auto transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))", boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}
        >
          <Download className="size-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-5 py-3 border-b-2 border-primary/10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
          <span>Date</span>
          <span>In</span>
          <span>Out</span>
          <span className="text-right">Net</span>
        </div>
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No attendance this month.</div>}
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-5 py-3 border-b border-border last:border-0 text-sm hover:bg-primary/[0.025] transition-colors">
            <span className="font-medium">{fmtDate(r.punch_in_at)}</span>
            <span className="font-mono tabular-nums">{fmtTime(r.punch_in_at)}</span>
            <span className="font-mono tabular-nums">{fmtTime(r.punch_out_at)}</span>
            <span className="font-mono tabular-nums text-right font-bold">
              {r.net_seconds != null ? `${(r.net_seconds / 3600).toFixed(1)}h` : "—"}
            </span>
          </div>
        ))}
        {rows.length > 0 && (
          <div className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-5 py-3 bg-muted/40 text-sm font-bold">
            <span>Total</span>
            <span />
            <span />
            <span className="font-mono tabular-nums text-right">{totalHours.toFixed(1)}h</span>
          </div>
        )}
      </div>
    </div>
  );
}
