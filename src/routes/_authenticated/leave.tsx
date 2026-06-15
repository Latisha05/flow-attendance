import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { getLeaveData, requestLeave } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import gsap from "gsap";

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({ meta: [{ title: "Leave — Punch" }] }),
  component: LeavePage,
});

function LeaveCard({
  r,
  delay,
}: {
  r: {
    id: string;
    start_date: string;
    end_date: string;
    days: number;
    status: "approved" | "pending" | "declined";
    reason?: string | null;
  };
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -30px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
      className="flex items-center justify-between p-4 rounded-2xl"
      style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.07)" }}
    >
      <div>
        <p className="font-bold capitalize">Paid leave</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
          {r.status === "pending" && (
            <span className="size-1.5 rounded-full bg-amber-400 pulse-dot inline-block" />
          )}
          {new Date(r.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {r.start_date !== r.end_date &&
            ` – ${new Date(r.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          {" · "}
          {r.days} day{r.days > 1 ? "s" : ""}
        </p>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase badge-${r.status}`}>
        {r.status}
      </span>
    </motion.div>
  );
}

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

  // GSAP entrance for balance card
  const balanceCardRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const tl = gsap.timeline();
    if (headerRef.current) {
      tl.from(headerRef.current, { y: -16, opacity: 0, duration: 0.4, ease: "power3.out" });
    }
    if (balanceCardRef.current) {
      tl.from(balanceCardRef.current, { y: 20, opacity: 0, scale: 0.97, duration: 0.5, ease: "power3.out" }, "-=0.2");
    }
    if (fabRef.current) {
      tl.from(fabRef.current, { scale: 0, duration: 0.5, ease: "back.out(1.7)" }, "-=0.1");
    }
  }, []);

  const mut = useMutation({
    mutationFn: () => requestLeave(userId, start, end, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave", userId] });
      setOpen(false);
      setReason("");
      toast.success("Leave requested ✓");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const balance = data?.balance ?? 0;
  const balancePct = Math.min(100, balance * 100); // assuming max ~1.0 PL is full

  return (
    <div className="px-6 pt-12">
      <div className="flex items-center justify-between mb-6">
        <h1 ref={headerRef} className="font-display text-3xl font-extrabold">Time off</h1>

        {/* FAB — floating action button */}
        <button
          ref={fabRef}
          onClick={() => setOpen(true)}
          className="size-14 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{
            background: "linear-gradient(135deg, oklch(0.58 0.22 264), oklch(0.68 0.18 298))",
            boxShadow: "0 8px 24px oklch(0.65 0.22 264 / 0.45), 0 2px 8px oklch(0 0 0 / 0.3)",
          }}
        >
          <Plus className="size-6 text-white" />
        </button>
      </div>

      {/* Balance card */}
      <div
        ref={balanceCardRef}
        className="rounded-3xl p-6 text-foreground mb-8 relative overflow-hidden card-hero-border"
        style={{
          background: "oklch(0.16 0.04 264)",
          border: "1px solid oklch(1 0 0 / 0.1)",
        }}
      >
        {/* Ambient radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 85% 20%, oklch(0.65 0.22 264 / 0.25) 0%, transparent 60%)",
          }}
        />

        <div className="relative flex justify-between items-start mb-5">
          <div>
            <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Balance remaining</p>
            <h3 className="font-display text-4xl font-bold mt-1">
              {balance.toFixed(1)}{" "}
              <span className="text-lg font-medium text-foreground/40">PL</span>
            </h3>
          </div>
        </div>

        {/* Gradient progress bar */}
        <div className="relative w-full h-2.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${balancePct}%` }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1.1], delay: 0.3 }}
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(to right, oklch(0.7 0.2 162), oklch(0.65 0.18 182))",
              boxShadow: "0 0 10px oklch(0.7 0.2 162 / 0.5)",
            }}
          />
        </div>
      </div>

      {/* History */}
      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-3">History</p>
      <div className="space-y-2">
        {(data?.requests ?? []).length === 0 && (
          <div
            className="p-6 text-center text-sm text-muted-foreground rounded-2xl"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.07)" }}
          >
            No leave requests yet. Tap + to request time off.
          </div>
        )}
        {(data?.requests ?? []).map((r, i) => (
          <LeaveCard key={r.id} r={r} delay={i * 0.04} />
        ))}
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(6px)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] rounded-t-[2rem] p-6 z-50"
              style={{
                background: "oklch(0.14 0.028 264)",
                border: "1px solid oklch(1 0 0 / 0.08)",
                borderBottom: "none",
              }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "oklch(1 0 0 / 0.18)" }} />

              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl font-extrabold">Request leave</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="size-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "oklch(1 0 0 / 0.08)", border: "1px solid oklch(1 0 0 / 0.08)" }}
                >
                  <X className="size-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">From</span>
                    <input
                      type="date"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="mt-1 w-full h-12 px-3 rounded-2xl outline-none transition-all"
                      style={{
                        background: "oklch(1 0 0 / 0.06)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        color: "inherit",
                        colorScheme: "dark",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1px solid oklch(0.65 0.22 264 / 0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.65 0.22 264 / 0.12)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "1px solid oklch(1 0 0 / 0.1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">To</span>
                    <input
                      type="date"
                      required
                      value={end}
                      min={start}
                      onChange={(e) => setEnd(e.target.value)}
                      className="mt-1 w-full h-12 px-3 rounded-2xl outline-none transition-all"
                      style={{
                        background: "oklch(1 0 0 / 0.06)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        color: "inherit",
                        colorScheme: "dark",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1px solid oklch(0.65 0.22 264 / 0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.65 0.22 264 / 0.12)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "1px solid oklch(1 0 0 / 0.1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Reason</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Optional"
                    className="mt-1 w-full px-3 py-2 rounded-2xl resize-none outline-none transition-all"
                    style={{
                      background: "oklch(1 0 0 / 0.06)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = "1px solid oklch(0.65 0.22 264 / 0.5)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.65 0.22 264 / 0.12)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = "1px solid oklch(1 0 0 / 0.1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </label>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={mut.isPending}
                  className="w-full h-12 rounded-2xl font-semibold disabled:opacity-50 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.56 0.22 264), oklch(0.65 0.18 298))",
                    color: "white",
                    boxShadow: "0 4px 20px oklch(0.65 0.22 264 / 0.3)",
                  }}
                >
                  {mut.isPending ? "Submitting…" : "Submit request"}
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}