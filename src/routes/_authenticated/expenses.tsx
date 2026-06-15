import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Plus, X, Receipt, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getMyExpenses, requestExpense, EXPENSE_CATEGORIES } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Punch" }] }),
  component: ExpensesPage,
});

const STATUS = {
  approved: { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", border: "border-l-emerald-400", icon: CheckCircle2 },
  pending: { badge: "bg-amber-50 text-amber-700 border border-amber-200", border: "border-l-amber-400", icon: Clock },
  declined: { badge: "bg-rose-50 text-rose-700 border border-rose-200", border: "border-l-rose-400", icon: XCircle },
} as const;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function ExpensesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data } = useQuery({ queryKey: ["expenses", userId], queryFn: () => getMyExpenses(userId) });
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => requestExpense(userId, date, Number(amount), category, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", userId] });
      setOpen(false);
      setAmount("");
      setReason("");
      toast.success("Expense submitted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const expenses = data?.expenses ?? [];
  const totalApproved = expenses.filter((e) => e.status === "approved").reduce((a, e) => a + e.amount, 0);
  const totalPending = expenses.filter((e) => e.status === "pending").reduce((a, e) => a + e.amount, 0);

  return (
    <div className="px-6 pt-12 pb-28">
      <h1 className="font-display text-3xl font-extrabold mb-6">Expenses</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl p-4 border border-border" style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)" }}>
          <p className="text-[10px] uppercase font-bold text-primary/70 tracking-wider">Approved</p>
          <p className="font-display text-2xl font-extrabold text-primary mt-0.5">{inr(totalApproved)}</p>
        </div>
        <div className="rounded-2xl p-4 border border-border bg-white">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pending</p>
          <p className="font-display text-2xl font-extrabold mt-0.5">{inr(totalPending)}</p>
        </div>
      </div>

      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-3">History</p>
      <div className="space-y-2">
        {expenses.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            No expenses yet.
          </div>
        )}
        {expenses.map((x) => {
          const s = STATUS[x.status];
          const Icon = s.icon;
          return (
            <div key={x.id} className={`p-4 rounded-2xl bg-white border border-border border-l-4 ${s.border}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Receipt className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{inr(x.amount)} · {x.category}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(x.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${s.badge}`}>
                  <Icon className="size-3" />
                  {x.status}
                </span>
              </div>
              {x.reason && <p className="text-xs text-muted-foreground mt-1 pl-11">{x.reason}</p>}
            </div>
          );
        })}
      </div>

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
                <h2 className="font-display text-2xl font-extrabold">Claim expense</h2>
                <button onClick={() => setOpen(false)} className="size-9 rounded-full bg-muted flex items-center justify-center">
                  <X className="size-4" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Amount (₹)</span>
                    <input type="number" min="1" step="1" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="mt-1 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border tabular-nums focus:outline-none focus:border-primary" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Date</span>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Category</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary">
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Reason</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} placeholder="e.g. Taxi to client shoot" className="mt-1 w-full px-3 py-2 rounded-2xl bg-muted/60 border border-border resize-none focus:outline-none focus:border-primary" />
                </label>
                <button disabled={mut.isPending} className="w-full h-12 rounded-2xl text-white font-semibold disabled:opacity-50" style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}>
                  {mut.isPending ? "…" : "Submit claim"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
