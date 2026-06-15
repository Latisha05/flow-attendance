import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Plus, X, UserPlus, Copy, Users, Search, Eye, EyeOff, Trash2 } from "lucide-react";
import { addEmployee, getEmployees, deleteEmployee, getDepartments, type Employee } from "@/lib/store";
import { toast } from "sonner";
import { PunchEditor } from "./-punch-editor";
import { gsap } from "gsap";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — Admin" }] }),
  component: EmployeesPage,
});

function getInitials(name: string) {
  return name
    .split(" ").filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase()).join("") || "?";
}

function EmployeesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => getEmployees(),
  });
  const { data: departmentData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments(),
  });
  const [editPunch, setEditPunch] = useState<{ id: string; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const tableRef = useRef<HTMLDivElement>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-employees"] });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
      toast.success("Employee deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const employees = data?.employees ?? [];
  const filtered = employees.filter(
    (e) =>
      !search ||
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.emp_code?.toLowerCase().includes(search.toLowerCase()) ||
      e.team?.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!tableRef.current || filtered.length === 0) return;
    gsap.from(tableRef.current.querySelectorAll(".employee-row"), {
      y: 10, opacity: 0, stagger: 0.04,
      ease: "power2.out", duration: 0.4, clearProps: "all",
    });
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {employees.length} {employees.length === 1 ? "person" : "people"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="h-10 pl-9 pr-4 rounded-xl bg-white border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm w-56"
            />
          </div>
          {/* Add button */}
          <button
            onClick={() => setAddOpen(true)}
            className="h-10 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))",
              boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
            }}
          >
            <UserPlus className="size-4" />
            Add employee
          </button>
        </div>
      </div>

      {/* Table card */}
      <div
        className="bg-white border border-border rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[48px_120px_1fr_1fr_120px_140px_160px_56px] gap-4 px-5 py-3 border-b-2 border-primary/10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
          <span />
          <span>Employee ID</span>
          <span>Name</span>
          <span>Designation</span>
          <span>Department</span>
          <span>Password</span>
          <span>Email</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <Users className="size-12 text-primary/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">
              {search ? "No employees match your search." : "No employees yet."}
            </p>
            {!search && (
              <button
                onClick={() => setAddOpen(true)}
                className="mt-4 text-sm font-bold text-primary hover:underline"
              >
                Add your first employee →
              </button>
            )}
          </div>
        )}

        {/* Rows */}
        <div ref={tableRef}>
          {filtered.map((e) => (
            <div
              key={e.id}
              className="employee-row grid md:grid-cols-[48px_120px_1fr_1fr_120px_140px_160px_56px] gap-3 md:gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center hover:bg-primary/[0.025] transition-colors"
            >
              {/* Avatar */}
              <div
                className="hidden md:flex size-9 rounded-full items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
              >
                {getInitials(e.full_name || "")}
              </div>

              {/* Emp code chip */}
              <div>
                <span className="font-mono text-xs font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md">
                  {e.emp_code}
                </span>
              </div>

              {/* Name */}
              <div className="min-w-0">
                <button
                  onClick={() => setEditPunch({ id: e.id, name: e.full_name || "Unnamed" })}
                  className="font-semibold text-sm truncate hover:text-primary hover:underline text-left transition-colors"
                  title="Edit attendance"
                >
                  {e.full_name || "Unnamed"}
                </button>
              </div>

              {/* Designation */}
              <div className="text-sm text-muted-foreground truncate">{e.designation || "—"}</div>

              {/* Team pill */}
              <div>
                {e.team ? (
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {e.team}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              {/* Password (hidden, reveal on eye) */}
              <PasswordCell password={e.password} />

              {/* Email / setup status */}
              <div className="text-xs truncate">
                {e.email ? (
                  <span className="text-muted-foreground">{e.email}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
                    Setup pending
                  </span>
                )}
              </div>

              {/* Delete */}
              <div className="flex justify-end">
                <button
                  onClick={() => setConfirmDelete({ id: e.id, name: e.full_name || "this employee" })}
                  className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                  title="Delete employee"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editPunch && (
        <Modal title={`Attendance — ${editPunch.name}`} onClose={() => setEditPunch(null)}>
          <PunchEditor userId={editPunch.id} onSaved={invalidate} />
        </Modal>
      )}

      {addOpen && (
        <Modal title="Add employee" onClose={() => setAddOpen(false)}>
          <AddEmployeeForm
            departments={departmentData?.departments ?? []}
            onClose={() => setAddOpen(false)}
            onSaved={invalidate}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete employee" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                Delete <span className="font-bold text-foreground">{confirmDelete.name}</span>? This also
                removes their attendance, leave, reports, WFH and expense records. This can't be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-12 rounded-2xl border border-border font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                className="flex-1 h-12 rounded-2xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleteMut.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddEmployeeForm({
  departments,
  onClose,
  onSaved,
}: {
  departments: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [team, setTeam] = useState(departments[0] ?? "");
  const [created, setCreated] = useState<Employee | null>(null);

  useEffect(() => {
    if (!team && departments.length > 0) {
      setTeam(departments[0]);
    }
  }, [departments, team]);

  const mut = useMutation({
    mutationFn: () => addEmployee(name, designation, team),
    onSuccess: (emp) => {
      onSaved();
      setCreated(emp);
      toast.success(`Added ${emp.full_name}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    mut.mutate();
  }

  if (created) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{created.full_name}</span> was added. Share these
          login details with them:
        </p>
        <Credential label="Employee ID" value={created.emp_code} />
        <Credential label="Password" value={created.password} />
        <p className="text-[11px] text-muted-foreground">
          They sign in with these on the employee app.
        </p>
        <button
          onClick={onClose}
          className="w-full h-12 rounded-2xl font-semibold text-white"
          style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoFocus
          className="mt-1.5 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Designation</span>
        <input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. Senior Engineer"
          className="mt-1.5 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Department</span>
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="mt-1.5 w-full h-12 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
        >
          {departments.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="w-full h-12 rounded-2xl font-semibold text-white flex items-center justify-center gap-2"
        style={{
          background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))",
          boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
        }}
      >
        <Plus className="size-4" />
        Add employee
      </button>
    </form>
  );
}

function PasswordCell({ password }: { password: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{shown ? password : "••••••••"}</span>
      <button
        onClick={() => setShown((s) => !s)}
        className="size-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shrink-0"
        title={shown ? "Hide password" : "Reveal password"}
      >
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-muted/50 border border-border">
      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
        <p className="font-mono font-bold text-sm mt-0.5 text-foreground">{value}</p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value);
          toast.success(`${label} copied`);
        }}
        className="size-9 rounded-xl border border-border flex items-center justify-center hover:bg-white hover:border-primary/30 transition-all"
        title={`Copy ${label}`}
      >
        <Copy className="size-4" />
      </button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(79,70,229,0.12)" }}
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-3xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        style={{ boxShadow: "0 24px 60px rgba(79,70,229,0.15), 0 4px 16px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <button
            onClick={onClose}
            className="size-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
