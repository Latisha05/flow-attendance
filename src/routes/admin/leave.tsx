import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { decideLeave, getAdminOps } from "@/lib/api/leave.functions";
import { DEV_BYPASS } from "@/lib/dev-mock";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/leave")({
  head: () => ({ meta: [{ title: "Leave — Admin" }] }),
  component: AdminLeavePage,
});

function AdminLeavePage() {
  const qc = useQueryClient();
  const fetch = useServerFn(getAdminOps);
  const decide = useServerFn(decideLeave);
  const { data } = useQuery({
    queryKey: ["admin-ops"],
    queryFn: () =>
      DEV_BYPASS
        ? Promise.resolve({ counts: { present: 0, onLeave: 0, total: 0 }, pending: [], roster: [] })
        : fetch(),
    retry: false,
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) =>
      DEV_BYPASS ? Promise.resolve({ ok: true }) : decide({ data: v }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-ops"] });
      toast.success(v.approve ? "Approved" : "Declined");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const pending = data?.pending ?? [];

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Present now" value={data?.counts.present ?? 0} />
        <Stat label="On leave" value={data?.counts.onLeave ?? 0} accent />
        <Stat label="Total staff" value={data?.counts.total ?? 0} />
      </div>

      <h1 className="font-display text-2xl font-extrabold mb-4">Pending approvals ({pending.length})</h1>

      <div className="space-y-3">
        {pending.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            All caught up.
          </div>
        )}
        {pending.map((p) => (
          <div key={p.id} className="bg-white border border-border rounded-2xl p-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-sm">{p.name}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {p.days} day{p.days > 1 ? "s" : ""} ·{" "}
                {new Date(p.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {p.start_date !== p.end_date &&
                  ` – ${new Date(p.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              </p>
              {p.reason && <p className="text-xs text-muted-foreground mt-1.5">“{p.reason}”</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => mut.mutate({ id: p.id, approve: false })}
                disabled={mut.isPending}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted"
              >
                Decline
              </button>
              <button
                onClick={() => mut.mutate({ id: p.id, approve: true })}
                disabled={mut.isPending}
                className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <p className={`font-display text-3xl font-extrabold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
