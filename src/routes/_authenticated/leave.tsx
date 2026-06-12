import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { getLeaveData, requestLeave } from "@/lib/api/leave.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({ meta: [{ title: "Leave — Punch" }] }),
  component: LeavePage,
});

const statusStyles = {
  approved: "bg-green-50 text-green-700",
  pending: "bg-yellow-50 text-yellow-700",
  declined: "bg-red-50 text-red-700",
} as const;

function LeavePage() {
  const qc = useQueryClient();
  const fetchLeave = useServerFn(getLeaveData);
  const reqFn = useServerFn(requestLeave);
  const { data } = useQuery({ queryKey: ["leave"], queryFn: () => fetchLeave() });
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => reqFn({ data: { start_date: start, end_date: end, reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      setOpen(false);
      setReason("");
      toast.success("Leave requested");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="px-6 pt-12">
      <h1 className="font-display text-3xl font-extrabold mb-6">Time off</h1>

      {/* Balance */}
      <div className="bg-foreground rounded-3xl p-6 text-background mb-8">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-[10px] uppercase font-bold text-background/40 tracking-wider">Balance remaining</p>
            <h3 className="font-display text-4xl font-bold mt-1">
              {(data?.balance ?? 0).toFixed(1)}{" "}
              <span className="text-lg font-medium text-background/40">PL</span>
            </h3>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="size-12 rounded-full border border-background/20 flex items-center justify-center hover:bg-background/10 transition"
          >
            <Plus className="size-5" />
          </motion.button>
        </div>
        <div className="w-full h-1 bg-background/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (data?.balance ?? 0) * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1.1] }}
            className="h-full bg-background"
          />
        </div>
      </div>

      {/* History */}
      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-3">History</p>
      <div className="space-y-2">
        {(data?.requests ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            No leave requests yet.
          </div>
        )}
        {(data?.requests ?? []).map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-border"
          >
            <div>
              <p className="font-bold capitalize">Paid leave</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {r.start_date !== r.end_date &&
                  ` – ${new Date(r.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                {" · "}
                {r.days} day{r.days > 1 ? "s" : ""}
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusStyles[r.status]}`}
            >
              {r.status}
            </span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-background rounded-t-[2rem] p-6 z-50"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl font-extrabold">Request leave</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="size-9 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="size-4" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mut.mutate();
                }}
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
                      className="mt-1 w-full h-12 px-3 rounded-2xl bg-white border border-border"
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
                      className="mt-1 w-full h-12 px-3 rounded-2xl bg-white border border-border"
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
                    className="mt-1 w-full px-3 py-2 rounded-2xl bg-white border border-border resize-none"
                  />
                </label>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={mut.isPending}
                  className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50"
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