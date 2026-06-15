import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Plus, X, Home, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getMyWfh, requestWfh } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wfh")({
  head: () => ({ meta: [{ title: "Work from home — Punch" }] }),
  component: WfhPage,
});

const STATUS = {
  approved: { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", border: "border-l-emerald-400", icon: CheckCircle2 },
  pending: { badge: "bg-amber-50 text-amber-700 border border-amber-200", border: "border-l-amber-400", icon: Clock },
  declined: { badge: "bg-rose-50 text-rose-700 border border-rose-200", border: "border-l-rose-400", icon: XCircle },
} as const;

function WfhPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data } = useQuery({ queryKey: ["wfh", userId], queryFn: () => getMyWfh(userId) });
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => requestWfh(userId, date, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wfh", userId] });
      setOpen(false);
      setReason("");
      toast.success("WFH request submitted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const requests = data?.requests ?? [];

  return (
    <div className="px-6 pt-12 pb-28">
      <h1 className="font-display text-3xl font-extrabold mb-6">Work from home</h1>

      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-3">History</p>
      <div className="space-y-2">
        {requests.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            No WFH requests yet.
          </div>
        )}
        {requests.map((r) => {
          const s = STATUS[r.status];
          const Icon = s.icon;
          return (
            <div key={r.id} className={`flex items-center justify-between p-4 rounded-2xl bg-white border border-border border-l-4 ${s.border}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Home className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm">
                    {new Date(r.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  {r.reason && <p className="text-xs text-muted-foreground truncate">{r.reason}</p>}
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${s.badge}`}>
                <Icon className="size-3" />
                {r.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-28 right-6 size-14 rounded-2xl text-white flex items-center justify-center z-30"
        style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))", boxShadow: "0 8px 24px rgba(79,70,229,0.4)" }}
      >
        <Plus className="size-6" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-white rounded-t-[2rem] p-6 z-50"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl font-extrabold">Request WFH</h2>
                <button onClick={() => setOpen(false)} className="size-9 rounded-full bg-muted flex items-center justify-center">
                  <X className="size-4" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Date</span>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Reason</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Why are you working from home?" className="mt-1 w-full px-3 py-2 rounded-2xl bg-muted/60 border border-border resize-none focus:outline-none focus:border-primary" />
                </label>
                <button disabled={mut.isPending} className="w-full h-12 rounded-2xl text-white font-semibold disabled:opacity-50" style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}>
                  {mut.isPending ? "…" : "Submit request"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
