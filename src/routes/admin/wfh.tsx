import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardByDate, decideWfh } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wfh")({
  head: () => ({ meta: [{ title: "WFH requests — Admin" }] }),
  component: AdminWfhPage,
});

function AdminWfhPage() {
  const qc = useQueryClient();
  // Reuse the date-keyed dashboard; show all WFH requests submitted on a date.
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({ queryKey: ["admin-dashboard", date], queryFn: () => getDashboardByDate(date) });

  const mut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decideWfh(v.id, v.approve),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(v.approve ? "Approved" : "Declined");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const requests = data?.wfhRequests ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-extrabold">WFH requests</h1>
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Submitted on</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block h-11 px-3 rounded-xl bg-white border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
          />
        </label>
      </div>

      <div className="space-y-3">
        {requests.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            No WFH requests for this day.
          </div>
        )}
        {requests.map((r) => (
          <div key={r.id} className="bg-white border border-border rounded-2xl p-5 flex flex-wrap items-center gap-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-sm">{r.name}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {new Date(r.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </p>
              {r.reason && <p className="text-xs text-muted-foreground mt-1.5">“{r.reason}”</p>}
            </div>
            {r.status === "pending" ? (
              <div className="flex gap-2">
                <button onClick={() => mut.mutate({ id: r.id, approve: false })} disabled={mut.isPending} className="px-4 py-2 rounded-xl border border-border text-xs font-bold disabled:opacity-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all">Decline</button>
                <button onClick={() => mut.mutate({ id: r.id, approve: true })} disabled={mut.isPending} className="px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}>Approve</button>
              </div>
            ) : (
              <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full ${r.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>{r.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
