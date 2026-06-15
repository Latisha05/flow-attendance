import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardByDate, decideExpense } from "@/lib/store";
import { useState } from "react";
import { Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Admin" }] }),
  component: AdminExpensesPage,
});

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function AdminExpensesPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({ queryKey: ["admin-dashboard", date], queryFn: () => getDashboardByDate(date) });

  const mut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decideExpense(v.id, v.approve),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(v.approve ? "Approved" : "Declined");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const expenses = data?.expenses ?? [];
  const total = expenses.reduce((a, x) => a + x.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Expenses</h1>
          {expenses.length > 0 && <p className="text-sm text-muted-foreground mt-1">Total claimed: <span className="font-bold text-primary">{inr(total)}</span></p>}
        </div>
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Expense date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block h-11 px-3 rounded-xl bg-white border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
          />
        </label>
      </div>

      <div className="space-y-3">
        {expenses.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            No expenses for this day.
          </div>
        )}
        {expenses.map((x) => (
          <div key={x.id} className="bg-white border border-border rounded-2xl p-5 flex flex-wrap items-center gap-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Receipt className="size-5" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-sm">{x.name} · <span className="text-primary">{inr(x.amount)}</span></p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{x.category}</p>
              {x.reason && <p className="text-xs text-muted-foreground mt-1.5">“{x.reason}”</p>}
            </div>
            {x.status === "pending" ? (
              <div className="flex gap-2">
                <button onClick={() => mut.mutate({ id: x.id, approve: false })} disabled={mut.isPending} className="px-4 py-2 rounded-xl border border-border text-xs font-bold disabled:opacity-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all">Decline</button>
                <button onClick={() => mut.mutate({ id: x.id, approve: true })} disabled={mut.isPending} className="px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}>Approve</button>
              </div>
            ) : (
              <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full ${x.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>{x.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
