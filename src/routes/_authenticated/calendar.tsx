import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowLeft, X } from "lucide-react";
import { getAttendanceMonth } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import gsap from "gsap";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Attendance" }] }),
  component: CalendarPage,
});

type Status = "full" | "partial" | "open" | "absent" | "weekend" | "future" | "today-empty";

function statusOf(
  date: Date,
  rows: { punch_in_at: string; punch_out_at: string | null; net_seconds: number | null }[]
): Status {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const isWeekend = d.getDay() === 0; // only Sunday is off
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

const STATUS_STYLE: Record<Status, {
  bg: string;
  bgInline?: string;
  text: string;
  label: string;
  dot: string;
  glow?: string;
}> = {
  full:         { bg: "bg-emerald-500",   text: "text-white",            label: "Full day",    dot: "bg-emerald-500",      glow: "0 2px 10px oklch(0.7 0.2 162 / 0.55)" },
  partial:      { bg: "bg-amber-400",     text: "text-foreground",       label: "Partial",     dot: "bg-amber-400",        glow: "0 2px 8px oklch(0.8 0.18 80 / 0.4)" },
  open:         { bg: "",                 bgInline: "linear-gradient(135deg, oklch(0.58 0.22 264), oklch(0.68 0.18 298))", text: "text-white", label: "In progress", dot: "bg-primary", glow: "0 2px 14px oklch(0.65 0.22 264 / 0.55)" },
  absent:       { bg: "bg-rose-900/60",   text: "text-rose-300",         label: "Absent",      dot: "bg-rose-400" },
  weekend:      { bg: "",                 bgInline: "oklch(1 0 0 / 0.04)", text: "text-muted-foreground", label: "Weekend", dot: "bg-muted-foreground/40" },
  future:       { bg: "bg-transparent",  text: "text-muted-foreground/40", label: "Upcoming",  dot: "bg-border" },
  "today-empty":{ bg: "",                bgInline: "transparent",         text: "text-primary", label: "Today",   dot: "bg-primary" },
};

// Detail panel for a selected day
function DayDetail({
  date,
  rows,
  onClose,
}: {
  date: Date;
  rows: { punch_in_at: string; punch_out_at: string | null; net_seconds: number | null }[];
  onClose: () => void;
}) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const dayRows = rows.filter((r) => {
    const t = new Date(r.punch_in_at).getTime();
    return t >= date.getTime() && t < next.getTime();
  });
  const totalSeconds = dayRows.reduce((a, r) => a + (r.net_seconds ?? 0), 0);
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const fmtDur = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (panelRef.current) {
      gsap.from(panelRef.current, { y: 20, opacity: 0, duration: 0.28, ease: "power2.out" });
    }
  }, []);

  return (
    <div ref={panelRef} className="mt-4 p-4 rounded-2xl card-hero-border" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-extrabold text-sm">
          {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <button onClick={onClose} className="size-7 rounded-full flex items-center justify-center" style={{ background: "oklch(1 0 0 / 0.08)" }}>
          <X className="size-3.5" />
        </button>
      </div>
      {dayRows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attendance data for this day.</p>
      ) : (
        <div className="space-y-2">
          {dayRows.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{fmt(r.punch_in_at)}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="font-mono text-muted-foreground">{r.punch_out_at ? fmt(r.punch_out_at) : "In progress"}</span>
              </div>
              {r.net_seconds != null && (
                <span className="font-bold text-foreground">{fmtDur(r.net_seconds)}</span>
              )}
            </div>
          ))}
          {dayRows.length > 0 && (
            <div className="pt-2 border-t border-border flex justify-between text-xs">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-bold text-primary">{fmtDur(totalSeconds)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dir, setDir] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
    setSelectedDate(null);
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const todayKey = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); })();

  // Header entrance
  const headerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (headerRef.current) {
      gsap.from(headerRef.current, { y: -12, opacity: 0, duration: 0.4, ease: "power3.out" });
    }
  }, []);

  return (
    <div className="px-6 pt-12 pb-24 animate-thunk">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="size-10 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.08)" }}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Attendance</p>
          <h1 className="font-display text-xl font-extrabold mt-0.5">Calendar</h1>
        </div>
        <div className="size-10" />
      </div>

      {/* Calendar card */}
      <div
        className="p-5 rounded-3xl card-hero-border"
        style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => shift(-1)}
            className="size-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "oklch(1 0 0 / 0.07)", border: "1px solid oklch(1 0 0 / 0.07)" }}
          >
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
          <button
            onClick={() => shift(1)}
            className="size-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "oklch(1 0 0 / 0.07)", border: "1px solid oklch(1 0 0 / 0.07)" }}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
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
              const isToday = (() => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() === todayKey; })();
              const isSelected = selectedDate?.getTime() === d.getTime();
              const isPast = d.getTime() < todayKey;

              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18, delay: i * 0.004 }}
                  onClick={() => {
                    if (isPast || isToday) {
                      setSelectedDate(prev => prev?.getTime() === d.getTime() ? null : new Date(d));
                    }
                  }}
                  className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold tabular-nums cursor-default transition-transform ${style.bg} ${style.text} ${!style.bg ? "" : ""}`}
                  style={{
                    background: style.bgInline || undefined,
                    boxShadow: isSelected
                      ? "0 0 0 2px oklch(0.65 0.22 264), 0 0 12px oklch(0.65 0.22 264 / 0.4)"
                      : style.glow || "none",
                    cursor: isPast || isToday ? "pointer" : "default",
                    outline: s === "today-empty"
                      ? "2px dashed oklch(0.65 0.22 264 / 0.7)"
                      : isToday && s !== "today-empty"
                      ? "2px solid oklch(0.65 0.22 264)"
                      : "none",
                    outlineOffset: "2px",
                  }}
                >
                  {d.getDate()}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Day detail panel */}
      <AnimatePresence>
        {selectedDate && (
          <DayDetail
            key={selectedDate.getTime()}
            date={selectedDate}
            rows={rows}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <div
        className="mt-4 p-4 rounded-2xl"
        style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">Legend</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(["full","partial","open","absent","weekend","today-empty"] as Status[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${STATUS_STYLE[s].dot}`} />
              <span className="text-[11px] font-medium">{STATUS_STYLE[s].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
