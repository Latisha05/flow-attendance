import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Building2, CalendarOff, FileText, Home as HomeIcon, Receipt, UserX, Users } from "lucide-react";
import { getDashboardByDate, getDepartments } from "@/lib/store";

export const Route = createFileRoute("/admin/home")({
  head: () => ({ meta: [{ title: "Dashboard - Admin" }] }),
  component: AdminHomePage,
});

const inr = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;

function AdminHomePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({
    queryKey: ["admin-dashboard", date],
    queryFn: () => getDashboardByDate(date),
  });
  const { data: departmentData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments(),
  });

  const counts = data?.counts;
  const leavePending = (data?.leaveRequests ?? []).filter((request) => request.status === "pending").length;
  const wfhPending = (data?.wfhRequests ?? []).filter((request) => request.status === "pending").length;
  const expensePending = (data?.expenses ?? []).filter((expense) => expense.status === "pending").length;
  const pendingActions = leavePending + wfhPending + expensePending;
  const expenseTotal = (data?.expenses ?? []).reduce((total, expense) => total + expense.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Select date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block h-11 min-w-48 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Present" value={counts?.present ?? 0} note="Checked in" icon={Users} tint="bg-emerald-50 text-emerald-700" />
        <StatCard label="On leave" value={counts?.onLeave ?? 0} note="Approved leave" icon={CalendarOff} tint="bg-amber-50 text-amber-700" />
        <StatCard label="WFH" value={counts?.wfh ?? 0} note="Remote today" icon={HomeIcon} tint="bg-primary/10 text-primary" />
        <StatCard label="Absent" value={counts?.absent ?? 0} note="Needs follow-up" icon={UserX} tint="bg-rose-50 text-rose-700" />
        <StatCard label="Pending actions" value={pendingActions} note="Approvals waiting" icon={FileText} tint="bg-slate-100 text-slate-700" />
      </div>

      <div className="mt-7">
        <h2 className="font-display text-xl font-extrabold">Detailed views</h2>
        <p className="text-sm text-muted-foreground mt-1">Open a section to view its complete details.</p>

        <div
          className="mt-4 grid overflow-hidden rounded-2xl border border-border bg-white md:grid-cols-2"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <QuickLinkRow
            to="/admin/roster"
            title="Daily roster"
            value={`${counts?.present ?? 0}/${counts?.total ?? 0}`}
            detail={`On leave ${counts?.onLeave ?? 0}  |  WFH ${counts?.wfh ?? 0}  |  Absent ${counts?.absent ?? 0}`}
            icon={Users}
          />
          <QuickLinkRow
            to="/admin/leave"
            title="Leave approvals"
            value={String(data?.leaveRequests.length ?? 0)}
            detail={`${leavePending} pending approval`}
            icon={CalendarOff}
          />
          <QuickLinkRow
            to="/admin/wfh"
            title="WFH requests"
            value={String(data?.wfhRequests.length ?? 0)}
            detail={`${wfhPending} pending approval`}
            icon={HomeIcon}
          />
          <QuickLinkRow
            to="/admin/expenses"
            title="Expense claims"
            value={expenseTotal > 0 ? inr(expenseTotal) : "Rs 0"}
            detail={`${expensePending} pending  |  ${data?.expenses.length ?? 0} claims`}
            icon={Receipt}
          />
          <QuickLinkRow
            to="/admin/employees"
            title="Employees"
            value={String(counts?.total ?? 0)}
            detail="Directory and attendance corrections"
            icon={Users}
          />
          <QuickLinkRow
            to="/admin/departments"
            title="Departments"
            value={String(departmentData?.departments.length ?? 0)}
            detail="Names, members and employee dropdowns"
            icon={Building2}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Users;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className={`inline-flex size-8 items-center justify-center rounded-xl ${tint}`}>
          <Icon className="size-4" />
        </div>
        <p className="font-display text-2xl font-extrabold">{value}</p>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

function QuickLinkRow({
  to,
  title,
  value,
  detail,
  icon: Icon,
}: {
  to: string;
  title: string;
  value: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-primary/[0.025] md:odd:border-r md:[&:nth-last-child(2)]:border-b-0"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold">{title}</p>
          <span className="text-sm font-extrabold text-primary">{value}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
