import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, X, UserPlus } from "lucide-react";
import { getEmployees } from "@/lib/api/admin.functions";
import { toast } from "sonner";
import { PunchEditor } from "./-punch-editor";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — Admin" }] }),
  component: EmployeesPage,
});

// Placeholder teams — swap for the real list when decided.
const TEAMS = ["Engineering", "Design", "Sales", "Operations", "Support"];

function EmployeesPage() {
  const qc = useQueryClient();
  const fetchEmployees = useServerFn(getEmployees);
  const { data } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => fetchEmployees(),
  });
  const [editPunch, setEditPunch] = useState<{ id: string; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-employees"] });

  const employees = data?.employees ?? [];

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} people</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="h-11 px-4 rounded-xl bg-foreground text-background text-sm font-bold flex items-center gap-2"
        >
          <UserPlus className="size-4" />
          Add employee
        </button>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Name</span>
          <span>Designation</span>
          <span>Team</span>
        </div>

        {employees.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No employees yet.</div>
        )}

        {employees.map((e) => (
          <div
            key={e.id}
            className="grid md:grid-cols-[1fr_1fr_1fr] gap-3 md:gap-4 px-5 py-4 border-b border-border last:border-0 items-center"
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
            <div className="text-sm text-muted-foreground">—</div>
            <div className="text-sm text-muted-foreground">—</div>
          </div>
        ))}
      </div>

      {editPunch && (
        <Modal title={`Attendance — ${editPunch.name}`} onClose={() => setEditPunch(null)}>
          <PunchEditor userId={editPunch.id} onSaved={invalidate} />
        </Modal>
      )}

      {addOpen && (
        <Modal title="Add employee" onClose={() => setAddOpen(false)}>
          <AddEmployeeForm onClose={() => setAddOpen(false)} />
        </Modal>
      )}
    </div>
  );
}

function AddEmployeeForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [team, setTeam] = useState(TEAMS[0]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    // No backend wired yet — capture the values and close.
    toast.success(`Saved ${name.trim()} (${designation || "—"}, ${team})`);
    onClose();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoFocus
          className="mt-1 w-full h-12 px-3 rounded-2xl bg-white border border-border focus:outline-none focus:border-primary transition"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Designation</span>
        <input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. Senior Engineer"
          className="mt-1 w-full h-12 px-3 rounded-2xl bg-white border border-border focus:outline-none focus:border-primary transition"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Team</span>
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="mt-1 w-full h-12 px-3 rounded-2xl bg-white border border-border focus:outline-none focus:border-primary transition"
        >
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2"
      >
        <Plus className="size-4" />
        Add employee
      </button>
    </form>
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
