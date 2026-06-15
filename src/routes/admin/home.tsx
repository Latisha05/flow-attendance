import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, CalendarOff, Home as HomeIcon, UserX, Receipt, FileText } from "lucide-react";
import { getDashboardByDate } from "@/lib/store";

export const Route = createFileRoute("/admin/home")({
  head: () => ({ meta: [{ title: "Dashboard — Admin" }] }),
  component: AdminHomePage,
});

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const STATUS_BADGE = {
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  declined: "bg-rose-50 text-rose-700 border border-rose-200",
} as const;

function AdminHomePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({
    queryKey: ["admin-dashboard", date],
    queryFn: () => getDashboardByDate(date),
  });

  const c = data?.counts;
  const expenseTotal = (data?.expenses ?? []).reduce((a, x) => a + x.amount, 0);

  return (
    <div>
      {/* Header + date picker */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-primary tracking-widest">Select date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block h-11 px-3 rounded-xl bg-white border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
          />
        </label>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Present" value={c?.present ?? 0} icon={Users} tint="text-emerald-600 bg-emerald-50" />
        <StatCard label="On leave" value={c?.onLeave ?? 0} icon={CalendarOff} tint="text-amber-600 bg-amber-50" />
        <StatCard label="Work from home" value={c?.wfh ?? 0} icon={HomeIcon} tint="text-primary bg-primary/10" />
        <StatCard label="Absent" value={c?.absent ?? 0} icon={UserX} tint="text-rose-600 bg-rose-50" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Present */}
        <Section title="Present employees" icon={Users} count={data?.present.length ?? 0}>
          {(data?.present ?? []).map((p) => (
            <Row key={p.id} name={p.name} sub={p.team} />
          ))}
          {(data?.present ?? []).length === 0 && <Empty text="Nobody marked present." />}
        </Section>

        {/* On leave */}
        <Section title="On leave" icon={CalendarOff} count={data?.onLeave.length ?? 0}>
          {(data?.onLeave ?? []).map((p) => (
            <Row key={p.id} name={p.name} />
          ))}
          {(data?.onLeave ?? []).length === 0 && <Empty text="Nobody on leave." />}
        </Section>

        {/* Leave requests submitted that day */}
        <Section title="Leave requests" icon={FileText} count={data?.leaveRequests.length ?? 0}>
          {(data?.leaveRequests ?? []).map((r) => (
            <Row
              key={r.id}
              name={r.name}
              sub={`${r.days} day${r.days > 1 ? "s" : ""}`}
              badge={r.status}
            />
          ))}
          {(data?.leaveRequests ?? []).length === 0 && <Empty text="No leave requests." />}
        </Section>

        {/* WFH requests submitted that day */}
        <Section title="WFH requests" icon={HomeIcon} count={data?.wfhRequests.length ?? 0}>
          {(data?.wfhRequests ?? []).map((r) => (
            <Row
              key={r.id}
              name={r.name}
              sub={new Date(r.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              badge={r.status}
            />
          ))}
          {(data?.wfhRequests ?? []).length === 0 && <Empty text="No WFH requests." />}
        </Section>

        {/* Expenses */}
        <Section title="Expenses" icon={Receipt} count={data?.expenses.length ?? 0} extra={expenseTotal > 0 ? inr(expenseTotal) : undefined}>
          {(data?.expenses ?? []).map((x) => (
            <Row
              key={x.id}
              name={x.name}
              sub={`${inr(x.amount)} · ${x.category}`}
              badge={x.status}
            />
          ))}
          {(data?.expenses ?? []).length === 0 && <Empty text="No expenses." />}
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: number; icon: typeof Users; tint: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className={`size-9 rounded-xl flex items-center justify-center mb-3 ${tint}`}>
        <Icon className="size-4" />
      </div>
      <p className="font-display text-3xl font-extrabold">{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  extra,
  children,
}: {
  title: string;
  icon: typeof Users;
  count: number;
  extra?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="size-4" />
          </div>
          <h2 className="font-display font-extrabold text-sm">{title}</h2>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {extra && <span className="font-mono font-bold text-sm text-primary">{extra}</span>}
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">{children}</div>
    </div>
  );
}

function Row({ name, sub, badge }: { name: string; sub?: string; badge?: keyof typeof STATUS_BADGE }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      {badge && (
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[badge]}`}>{badge}</span>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-6 text-center text-xs text-muted-foreground">{text}</div>;
}
