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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/60">Admin overview</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight mt-2">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-primary tracking-[0.18em]">Select date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 block h-12 min-w-52 rounded-2xl border border-border bg-white px-4 text-sm shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Present" value={counts?.present ?? 0} note="Checked in" icon={Users} tint="bg-emerald-50 text-emerald-700" />
        <StatCard label="On leave" value={counts?.onLeave ?? 0} note="Approved leave" icon={CalendarOff} tint="bg-amber-50 text-amber-700" />
        <StatCard label="WFH" value={counts?.wfh ?? 0} note="Remote today" icon={HomeIcon} tint="bg-primary/10 text-primary" />
        <StatCard label="Absent" value={counts?.absent ?? 0} note="Needs follow-up" icon={UserX} tint="bg-rose-50 text-rose-700" />
        <StatCard label="Pending actions" value={pendingActions} note="Approvals waiting" icon={FileText} tint="bg-slate-100 text-slate-700" />
      </div>

      <div className="rounded-[28px] border border-border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Detailed views</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Open a focused page for each list instead of stacking everything here.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Stitch reference: clean dashboard drilldowns
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <QuickLinkCard
            to="/admin/roster"
            title="Daily roster"
            value={`${counts?.present ?? 0}/${counts?.total ?? 0}`}
            description="Present staff out of total employees"
            detail={`On leave ${counts?.onLeave ?? 0}  |  WFH ${counts?.wfh ?? 0}  |  Absent ${counts?.absent ?? 0}`}
            icon={Users}
          />
          <QuickLinkCard
            to="/admin/leave"
            title="Leave approvals"
            value={String(data?.leaveRequests.length ?? 0)}
            description="Requests submitted on the selected date"
            detail={`${leavePending} pending approval`}
            icon={CalendarOff}
          />
          <QuickLinkCard
            to="/admin/wfh"
            title="WFH requests"
            value={String(data?.wfhRequests.length ?? 0)}
            description="Remote work requests for this date"
            detail={`${wfhPending} pending approval`}
            icon={HomeIcon}
          />
          <QuickLinkCard
            to="/admin/expenses"
            title="Expense claims"
            value={expenseTotal > 0 ? inr(expenseTotal) : "Rs 0"}
            description="Total claimed amount for the selected date"
            detail={`${expensePending} pending  |  ${data?.expenses.length ?? 0} claims`}
            icon={Receipt}
          />
          <QuickLinkCard
            to="/admin/employees"
            title="Employees"
            value={String(counts?.total ?? 0)}
            description="Team directory and attendance corrections"
            detail="Open the full employee list"
            icon={Users}
          />
          <QuickLinkCard
            to="/admin/departments"
            title="Departments"
            value={String(departmentData?.departments.length ?? 0)}
            description="Manage department names and member lists"
            detail="Changes update the employee dropdown automatically"
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
    <div className="rounded-[24px] border border-border bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <div className={`mb-4 inline-flex size-11 items-center justify-center rounded-2xl ${tint}`}>
        <Icon className="size-5" />
      </div>
      <p className="font-display text-4xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function QuickLinkCard({
  to,
  title,
  value,
  description,
  detail,
  icon: Icon,
}: {
  to: string;
  title: string;
  value: string;
  description: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Link
      to={to}
      className="group rounded-[24px] border border-border bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="size-5" />
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      <div className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/60">{title}</p>
        <p className="mt-2 font-display text-3xl font-extrabold tracking-tight">{value}</p>
        <p className="mt-2 text-sm font-medium text-foreground">{description}</p>
        <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
      </div>
    </Link>
  );
}
