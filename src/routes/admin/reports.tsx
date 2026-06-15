import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";
import { getAdminReports, reviewReport } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Work reports — Admin" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ["admin-reports", date],
    queryFn: () => getAdminReports(date),
  });

  const mut = useMutation({
    mutationFn: (id: string) => reviewReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports", date] });
      toast.success("Marked reviewed");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const reports = data?.reports ?? [];
  const totalHours = reports.reduce((a, r) => a + Number(r.hours), 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Work reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {reports.length} submitted · {totalHours.toFixed(1)}h logged
          </p>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Date</span>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block h-11 px-3 rounded-xl bg-white border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
          />
        </label>
      </div>

      <div className="space-y-3">
        {reports.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            No reports for this day.
          </div>
        )}
        {reports.map((r) => (
          <div key={r.id} className="bg-white border border-border rounded-2xl p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="font-bold text-sm">{r.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{Number(r.hours).toFixed(1)}h</p>
              </div>
              {r.status === "reviewed" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="size-3" /> Reviewed
                </span>
              ) : (
                <button
                  onClick={() => mut.mutate(r.id)}
                  disabled={mut.isPending}
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
                >
                  Mark reviewed
                </button>
              )}
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
