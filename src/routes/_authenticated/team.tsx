import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { decideLeave, getAdminOps } from "@/lib/api/leave.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team — Punch" }] }),
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const fetch = useServerFn(getAdminOps);
  const decide = useServerFn(decideLeave);

  const { data, error } = useQuery({
    queryKey: ["admin-ops"],
    queryFn: () => fetch(),
    retry: false,
  });

  const mut = useMutation({
    mutationFn: (vars: { id: string; approve: boolean }) => decide({ data: vars }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-ops"] });
      toast.success(v.approve ? "Approved" : "Declined");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (error) {
    return (
      <div className="px-6 pt-20 text-center text-sm text-muted-foreground">
        Admin only.
      </div>
    );
  }

  return (
    <div className="px-6 pt-12">
      <div className="flex justify-between items-end mb-8">
        <h1 className="font-display text-3xl font-extrabold">Operations</h1>
        <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/5 rounded">LIVE</span>
      </div>

      <div className="grid grid-cols-3 mb-10">
        <Stat label="Present" value={data?.counts.present ?? 0} />
        <div className="border-x border-border">
          <Stat label="Leave" value={data?.counts.onLeave ?? 0} accent />
        </div>
        <Stat
          label="Absent"
          value={(data?.roster ?? []).filter((r) => r.status === "absent").length}
        />
      </div>

      <div className="flex justify-between mb-2">
        <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">
          Pending approvals ({data?.pending.length ?? 0})
        </p>
      </div>

      <div className="space-y-3">
        {(data?.pending ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground bg-white border border-border rounded-3xl">
            All caught up.
          </div>
        )}
        {(data?.pending ?? []).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-4 rounded-3xl bg-white border border-border"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-9 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold">{p.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  PL · {p.days} day{p.days > 1 ? "s" : ""} ·{" "}
                  {new Date(p.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
                {p.reason && <p className="text-xs text-muted-foreground mt-1">"{p.reason}"</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={mut.isPending}
                onClick={() => mut.mutate({ id: p.id, approve: false })}
                className="flex-1 bg-white border border-border py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Decline
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={mut.isPending}
                onClick={() => mut.mutate({ id: p.id, approve: true })}
                className="flex-1 bg-foreground text-background py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Approve
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 mb-2 text-[11px] font-bold uppercase text-muted-foreground tracking-widest">
        Today's roster
      </p>
      <div className="space-y-1.5">
        {(data?.roster ?? []).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-border"
          >
            <span className="text-sm font-medium">{r.name || "Unnamed"}</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                r.status === "present"
                  ? "text-green-700"
                  : r.status === "leave"
                    ? "text-accent"
                    : r.status === "done"
                      ? "text-blue-600"
                      : "text-muted-foreground"
              }`}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center px-2">
      <p className={`font-display text-3xl font-extrabold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">{label}</p>
    </div>
  );
}