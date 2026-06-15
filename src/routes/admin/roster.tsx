import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarOff, Home as HomeIcon, UserX, Users } from "lucide-react";
import { getDashboardByDate } from "@/lib/store";

export const Route = createFileRoute("/admin/roster")({
  head: () => ({ meta: [{ title: "Daily roster - Admin" }] }),
  component: AdminRosterPage,
});

function AdminRosterPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({
    queryKey: ["admin-dashboard", date],
    queryFn: () => getDashboardByDate(date),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/60">Team status</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight mt-2">Daily roster</h1>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RosterSection
          title="Present employees"
          count={data?.present.length ?? 0}
          icon={Users}
          empty="Nobody marked present."
          rows={(data?.present ?? []).map((employee) => ({
            key: employee.id,
            name: employee.name,
            sub: employee.team,
          }))}
        />
        <RosterSection
          title="On leave"
          count={data?.onLeave.length ?? 0}
          icon={CalendarOff}
          empty="Nobody on leave."
          rows={(data?.onLeave ?? []).map((employee) => ({
            key: employee.id,
            name: employee.name,
          }))}
        />
        <RosterSection
          title="Working from home"
          count={data?.wfhToday.length ?? 0}
          icon={HomeIcon}
          empty="Nobody is marked as WFH."
          rows={(data?.wfhToday ?? []).map((employee) => ({
            key: employee.id,
            name: employee.name,
          }))}
        />
        <RosterSection
          title="Absent"
          count={data?.absent.length ?? 0}
          icon={UserX}
          empty="Nobody is absent."
          rows={(data?.absent ?? []).map((employee) => ({
            key: employee.id,
            name: employee.name,
            sub: employee.team,
          }))}
        />
      </div>
    </div>
  );
}

function RosterSection({
  title,
  count,
  icon: Icon,
  empty,
  rows,
}: {
  title: string;
  count: number;
  icon: typeof Users;
  empty: string;
  rows: Array<{ key: string; name: string; sub?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{count} listed</p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</div>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">{row.name}</p>
              {row.sub && <p className="mt-1 text-xs text-muted-foreground">{row.sub}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
