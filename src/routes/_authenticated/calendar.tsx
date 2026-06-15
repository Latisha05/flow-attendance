import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { getAttendanceMonth } from "@/lib/store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Attendance" }] }),
  component: CalendarPage,
});

type Status = "full" | "partial" | "open" | "absent" | "weekend" | "future" | "today-empty";

function statusOf(date: Date, rows: { punch_in_at: string; punch_out_at: string | null; net_seconds: number | null }[]): Status {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const isWeekend = d.getDay() === 0; // only Sunday is off, Saturday is a working day
  if (d.getTime() > today.getTime()) return "future";
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  const dayRows = rows.filter((r) => {
    const t = new Date(r.punch_in_at).getTime();
    return t >= d.getTime() && t < next.getTime();
  });
  if (dayRows.length === 0) {
    if (d.getTime() === today.getTime()) return "today-empty";
    return isWeekend ? "weekend" : "absent";
  }
  if (dayRows.some((r) => !r.punch_out_at)) return "open";
  const total = dayRows.reduce((a, r) => a + (r.net_seconds ?? 0), 0);
  return total >= 8 * 3600 ? "full" : "partial";
}

const STATUS_STYLE: Record<Status, { bg: string; text: string; label: string; dot: string }> = {
  full:         { bg: "bg-emerald-500",          text: "text-white",            label: "Full day",    dot: "bg-emerald-500" },
  partial:      { bg: "bg-amber-400",            text: "text-foreground",       label: "Partial",     dot: "bg-amber-400" },
  open:         { bg: "bg-primary",              text: "text-white",            label: "In progress", dot: "bg-primary" },
  absent:       { bg: "bg-rose-200",             text: "text-rose-900",         label: "Absent",      dot: "bg-rose-300" },
  weekend:      { bg: "bg-muted",                text: "text-muted-foreground", label: "Weekend",     dot: "bg-muted-foreground/40" },
  future:       { bg: "bg-transparent",          text: "text-muted-foreground", label: "Upcoming",    dot: "bg-border" },
  "today-empty":{ bg: "bg-white border-2 border-dashed border-primary", text: "text-primary", label: "Today", dot: "bg-primary" },
};

function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dir, setDir] = useState(0);

  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data } = useQuery({
    queryKey: ["attendance-month", userId, cursor.y, cursor.m],
    queryFn: () => getAttendanceMonth(userId, cursor.y, cursor.m),
  });
  const rows = data?.rows ?? [];

  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const leadBlank = (first.getDay() + 6) % 7; // Mon-first
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadBlank }).map(() => null),
    ...Array.from({ length: daysInMonth }).map((_, i) => new Date(cursor.y, cursor.m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const shift = (delta: number) => {
    setDir(delta);
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const todayKey = (() => { const t = new Date(); t.setHours(0,0,0,0); return t.getTime(); })();

  return (
    <div className="px-6 pt-12 pb-24 animate-thunk">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="size-10 rounded-full bg-white border border-border flex items-center justify-center">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Attendance</p>
          <h1 className="font-display text-xl font-extrabold mt-0.5">Calendar</h1>
        </div>
        <div className="size-10" />
      </div>

      <div className="p-5 rounded-3xl bg-white border border-border">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => shift(-1)} className="size-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft className="size-4" />
          </button>
          <div className="overflow-hidden relative h-7 min-w-[10rem] flex justify-center">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.p
                key={`${cursor.y}-${cursor.m}`}
                custom={dir}
                initial={{ opacity: 0, y: dir >= 0 ? 12 : -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: dir >= 0 ? -12 : 12 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="font-display text-base font-extrabold tracking-tight absolute"
              >
                {monthLabel}
              </motion.p>
            </AnimatePresence>
          </div>
          <button onClick={() => shift(1)} className="size-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform">
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={`${cursor.y}-${cursor.m}-grid`}
            custom={dir}
            initial={{ opacity: 0, x: dir >= 0 ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir >= 0 ? -24 : 24 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="grid grid-cols-7 gap-1.5"
          >
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" />;
              const s = statusOf(d, rows);
              const style = STATUS_STYLE[s];
              const isToday = (() => { const x = new Date(d); x.setHours(0,0,0,0); return x.getTime() === todayKey; })();
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.005 }}
                  className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold tabular-nums ${style.bg} ${style.text} ${isToday && s !== "today-empty" ? "ring-2 ring-primary ring-offset-1" : ""}`}
                >
                  {d.getDate()}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="mt-5 p-4 rounded-2xl bg-white border border-border">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">Legend</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(["full","partial","open","absent","weekend","today-empty"] as Status[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`size-3 rounded-full ${STATUS_STYLE[s].dot}`} />
              <span className="text-[11px] font-medium">{STATUS_STYLE[s].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
