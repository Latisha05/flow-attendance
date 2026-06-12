import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Minus, Plus, Shield, ShieldOff, X } from "lucide-react";
import { getEmployees, setPlBalance, setRole } from "@/lib/api/admin.functions";
import { toast } from "sonner";
import { PunchEditor } from "./-punch-editor";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — Admin" }] }),
  component: EmployeesPage,
});

const statusColor = {
  present: "text-green-700 bg-green-50",
  done: "text-blue-600 bg-blue-50",
  absent: "text-muted-foreground bg-muted",
} as const;

function EmployeesPage() {
  const qc = useQueryClient();
  const fetchEmployees = useServerFn(getEmployees);
  const balanceFn = useServerFn(setPlBalance);
  const roleFn = useServerFn(setRole);
  const { data } = useQuery({ queryKey: ["admin-employees"], queryFn: () => fetchEmployees() });
  const [editPunch, setEditPunch] = useState<{ id: string; name: string } | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-employees"] });

  const balanceMut = useMutation({
    mutationFn: (v: { userId: string; balance: number }) => balanceFn({ data: v }),
    onSuccess: () => {
      invalidate();
      toast.success("Balance updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "employee" }) => roleFn({ data: v }),
    onSuccess: () => {
      invalidate();
      toast.success("Role updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const employees = data?.employees ?? [];

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} people</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_160px_140px] gap-4 px-5 py-3 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Name</span>
          <span>Today</span>
          <span>PL balance</span>
          <span>Role</span>
        </div>

        {employees.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No employees yet.</div>
        )}

        {employees.map((e) => (
          <div
            key={e.id}
            className="grid md:grid-cols-[1fr_120px_160px_140px] gap-3 md:gap-4 px-5 py-4 border-b border-border last:border-0 items-center"
          >
            <div className="min-w-0">
              <button
                onClick={() => setEditPunch({ id: e.id, name: e.full_name || "Unnamed" })}
                className="font-semibold text-sm truncate hover:underline text-left"
                title="Edit attendance"
              >
                {e.full_name || "Unnamed"}
              </button>
            </div>

            <div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor[e.todayStatus as keyof typeof statusColor]}`}>
                {e.todayStatus}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => balanceMut.mutate({ userId: e.id, balance: e.pl_balance - 0.5 })}
                disabled={balanceMut.isPending || e.pl_balance <= 0}
                className="size-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-12 text-center font-mono font-bold text-sm tabular-nums">{e.pl_balance.toFixed(1)}</span>
              <button
                onClick={() => balanceMut.mutate({ userId: e.id, balance: e.pl_balance + 0.5 })}
                disabled={balanceMut.isPending}
                className="size-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <div>
              <button
                onClick={() =>
                  roleMut.mutate({ userId: e.id, role: e.role === "admin" ? "employee" : "admin" })
                }
                disabled={roleMut.isPending}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
                  e.role === "admin"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
                title={e.role === "admin" ? "Demote to employee" : "Promote to admin"}
              >
                {e.role === "admin" ? <Shield className="size-3.5" /> : <ShieldOff className="size-3.5" />}
                {e.role}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editPunch && (
        <Modal title={`Attendance — ${editPunch.name}`} onClose={() => setEditPunch(null)}>
          <PunchEditor userId={editPunch.id} onSaved={invalidate} />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-3xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="size-9 rounded-full bg-muted flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
