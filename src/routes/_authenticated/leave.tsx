import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getLeaveData, requestLeave } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { gsap } from "gsap";

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({ meta: [{ title: "Leave — Punch" }] }),
  component: LeavePage,
});

const STATUS_CONFIG = {
  approved: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    border: "border-l-emerald-400",
    icon: CheckCircle2,
    dot: "bg-emerald-400",
  },
  pending: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    border: "border-l-amber-400",
    icon: Clock,
    dot: "bg-amber-400",
  },
  declined: {
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    border: "border-l-rose-400",
    icon: XCircle,
    dot: "bg-rose-400",
  },
} as const;

function LeavePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data } = useQuery({ queryKey: ["leave", userId], queryFn: () => getLeaveData(userId) });
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");
  const [usePaidLeave, setUsePaidLeave] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current?.children.length) return;
    gsap.set(listRef.current.children, { y: 16, opacity: 0 });
    const tl = gsap.timeline();
    tl.to(listRef.current.children, {
      y: 0, opacity: 1, stagger: 0.06,
      ease: "power2.out", duration: 0.5,
    });
    return () => { tl.kill(); };
  }, [data?.requests?.length]);

  const mut = useMutation({
    mutationFn: () => requestLeave(userId, start, end, reason, usePaidLeave),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave", userId] });
      setOpen(false);
      setReason("");
      setUsePaidLeave(false);
      toast.success("Leave requested");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const balance = data?.balance ?? 0;
  const hasPaidLeave = balance > 0;

  return (
    <div className="px-6 pt-12 pb-28">
      <h1 className="font-display text-3xl font-extrabold mb-6">Time off</h1>

      {/* Balance hero card — light pastel gradient */}
      <div
        className={`rounded-3xl p-6 mb-8 relative overflow-hidden border ${
          hasPaidLeave
            ? "border-primary/10"
            : "border-border bg-muted/50"
        }`}
        style={
          hasPaidLeave
            ? { background: "linear-gradient(135deg, hsl(245 60% 95%), hsl(258 60% 92%))" }
            : undefined
        }
      >
        <div className="relative flex justify-between items-center">
          <p
            className={`font-display text-xl font-extrabold ${
              hasPaidLeave ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {balance} Paid leave{balance === 1 ? "" : "s"} remaining
          </p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${
              hasPaidLeave
                ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                : "bg-muted-foreground/15 text-muted-foreground hover:bg-muted-foreground/20"
            }`}
          >
            <Plus className="size-5" />
          </motion.button>
        </div>
      </div>

      {/* History */}
      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-3">History</p>
      <div ref={listRef} className="space-y-2">
        {(data?.requests ?? []).length === 0 && (
          <div className="p-8 text-center bg-white border border-border rounded-2xl">
            <Calendar className="size-10 text-primary/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No leave requests yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Tap the <strong>+</strong> button to request time off.</p>
          </div>
        )}
        {(data?.requests ?? []).map((r, i) => {
          const cfg = STATUS_CONFIG[r.status];
          const StatusIcon = cfg.icon;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`leave-item flex items-center justify-between p-4 rounded-2xl bg-white border border-border border-l-4 ${cfg.border}`}
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted flex items-center justify-center">
                  <StatusIcon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold capitalize text-sm">
                    {r.use_paid_leave === false ? "Unpaid leave" : "Paid leave"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {r.start_date !== r.end_date &&
                      ` – ${new Date(r.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                    {" · "}
                    {r.days} day{r.days > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.badge}`}>
                <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                {r.status}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Request leave bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-white rounded-t-[2rem] p-6 z-50 border-t border-border"
              style={{ boxShadow: "0 -8px 40px rgba(79,70,229,0.10)" }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl font-extrabold">Request leave</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="size-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider">From</span>
                    <input
                      type="date"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="mt-1.5 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider">To</span>
                    <input
                      type="date"
                      required
                      value={end}
                      min={start}
                      onChange={(e) => setEnd(e.target.value)}
                      className="mt-1.5 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Reason</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Optional note for your manager"
                    className="mt-1.5 w-full px-3 py-3 rounded-2xl bg-muted/60 border border-border resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                  />
                </label>
                <div
                  className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
                    hasPaidLeave ? "border-primary/15 bg-primary/[0.04]" : "border-border bg-muted/50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold">Use paid leave</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hasPaidLeave
                        ? `${balance} paid leave${balance === 1 ? "" : "s"} available`
                        : "No paid leaves remaining"}
                    </p>
                  </div>
                  <Switch
                    checked={usePaidLeave}
                    onCheckedChange={setUsePaidLeave}
                    disabled={!hasPaidLeave}
                    aria-label="Use paid leave"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={mut.isPending}
                  className="w-full h-12 rounded-2xl font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))",
                    boxShadow: "0 6px 20px rgba(79,70,229,0.25)",
                  }}
                >
                  {mut.isPending ? "…" : "Submit request"}
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
