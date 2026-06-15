import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  addDepartment,
  deleteDepartment,
  getDepartments,
  getEmployees,
  renameDepartment,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/departments")({
  head: () => ({ meta: [{ title: "Departments - Admin" }] }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const qc = useQueryClient();
  const { data: departmentData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments(),
  });
  const { data: employeeData } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => getEmployees(),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);

  const departments = departmentData?.departments ?? [];
  const employees = employeeData?.employees ?? [];

  const rows = useMemo(
    () =>
      departments.map((department) => ({
        name: department,
        members: employees.filter((employee) => employee.team === department),
      })),
    [departments, employees],
  );

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["departments"] });
    qc.invalidateQueries({ queryKey: ["admin-employees"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  const assignedCount = employees.filter((employee) => employee.team).length;
  const unassignedCount = employees.length - assignedCount;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the department list used across admin and employee forms.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="h-10 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))",
            boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
          }}
        >
          <Plus className="size-4" />
          Add department
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Departments" value={departments.length} color="text-primary" />
        <Stat label="Assigned people" value={assignedCount} color="text-emerald-600" />
        <Stat label="Unassigned people" value={unassignedCount} color="" />
      </div>

      <div
        className="bg-white border border-border rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <div className="hidden md:grid grid-cols-[1.2fr_100px_1.8fr_96px] gap-4 px-5 py-3 border-b-2 border-primary/10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
          <span>Department</span>
          <span>People</span>
          <span>Members</span>
          <span className="text-right">Actions</span>
        </div>

        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No departments yet.
          </div>
        )}

        {rows.map((row) => (
          <div
            key={row.name}
            className="grid md:grid-cols-[1.2fr_100px_1.8fr_96px] gap-3 md:gap-4 px-5 py-4 border-b border-border last:border-0 items-start hover:bg-primary/[0.025] transition-colors"
          >
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{row.name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Used in employee records and dropdowns</p>
            </div>

            <div>
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-2 text-xs font-semibold text-secondary-foreground">
                {row.members.length}
              </span>
            </div>

            <div className="min-w-0">
              {row.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {row.members.map((member) => (
                    <span
                      key={member.id}
                      className="inline-flex max-w-full items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      <span className="truncate">{member.full_name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameOpen(row.name)}
                className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                title="Edit department"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => setDeleteOpen(row.name)}
                className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                title="Delete department"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {addOpen && (
        <Modal title="Add department" onClose={() => setAddOpen(false)}>
          <DepartmentForm
            actionLabel="Add department"
            onSubmit={async (name) => {
              await addDepartment(name);
              invalidateAll();
              setAddOpen(false);
              toast.success("Department added");
            }}
          />
        </Modal>
      )}

      {renameOpen && (
        <Modal title="Rename department" onClose={() => setRenameOpen(null)}>
          <DepartmentForm
            initialValue={renameOpen}
            actionLabel="Save name"
            onSubmit={async (name) => {
              await renameDepartment(renameOpen, name);
              invalidateAll();
              setRenameOpen(null);
              toast.success("Department updated");
            }}
          />
        </Modal>
      )}

      {deleteOpen && (
        <DeleteDepartmentModal
          department={deleteOpen}
          members={employees.filter((employee) => employee.team === deleteOpen)}
          onClose={() => setDeleteOpen(null)}
          onDeleted={() => {
            invalidateAll();
            setDeleteOpen(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color = "" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p className={`font-display text-3xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function DepartmentForm({
  initialValue = "",
  actionLabel,
  onSubmit,
}: {
  initialValue?: string;
  actionLabel: string;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialValue);
  const mutation = useMutation({
    mutationFn: async () => onSubmit(name),
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not save department";
      toast.error(message);
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Department name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          placeholder="e.g. Operations"
          className="mt-1.5 w-full h-11 px-3 rounded-xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full h-11 rounded-xl font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
      >
        {mutation.isPending ? "Saving..." : actionLabel}
      </button>
    </form>
  );
}

function DeleteDepartmentModal({
  department,
  members,
  onClose,
  onDeleted,
}: {
  department: string;
  members: Array<{ id: string; full_name: string }>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => deleteDepartment(department),
    onSuccess: () => {
      toast.success("Department deleted");
      onDeleted();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not delete department";
      toast.error(message);
    },
  });

  return (
    <Modal title="Delete department" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Trash2 className="size-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              Delete <span className="font-bold text-foreground">{department}</span>?
            </p>
            <p className="mt-1">
              {members.length === 0
                ? "No employees are assigned to it."
                : `${members.length} ${members.length === 1 ? "employee will" : "employees will"} become unassigned.`}
            </p>
          </div>
        </div>

        {members.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Affected employees</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {members.map((member) => (
                <span key={member.id} className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border">
                  {member.full_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 h-11 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
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
