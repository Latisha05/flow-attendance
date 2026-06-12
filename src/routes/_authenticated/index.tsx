import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MapPin, Hourglass, CalendarDays, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getDashboard, punchIn, punchOut } from "@/lib/api/attendance.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Home — Punch" }] }),
  component: HomePage,
});

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function tryGeo(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    const timeout = setTimeout(() => resolve({ lat: null, lng: null }), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timeout);
        resolve({ lat: null, lng: null });
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 },
    );
  });
}

function HomePage() {
  const qc = useQueryClient();
  const fetchDash = useServerFn(getDashboard);
  const inFn = useServerFn(punchIn);
  const outFn = useServerFn(punchOut);

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDash(),
    refetchOnWindowFocus: true,
  });

  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.open) {
      setElapsed(0);
      return;
    }
    const start = new Date(data.open.punch_in_at).getTime();
    const tick = () => {
      setElapsed((Date.now() - start) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data?.open?.id, data?.open?.punch_in_at]);

  const punchInMut = useMutation({
    mutationFn: async () => {
      const geo = await tryGeo();
      return inFn({ data: geo });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Punched in");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const punchOutMut = useMutation({
    mutationFn: async () => {
      if (!data?.open) throw new Error("No active punch");
      const geo = await tryGeo();
      return outFn({ data: { id: data.open.id, ...geo } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Punched out");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const punching = punchInMut.isPending || punchOutMut.isPending;
  const isOpen = !!data?.open;

  const today = data?.today ?? [];
  const todayNetSeconds = today.reduce((acc, r) => acc + (r.net_seconds ?? 0), 0) + (data?.open ? Math.max(0, elapsed - (elapsed >= 5 * 3600 ? 3600 : 0)) : 0);
  const goalSeconds = 8 * 3600;
  const progress = Math.min(1, todayNetSeconds / goalSeconds);
  const remainingSeconds = Math.max(0, goalSeconds - todayNetSeconds);
  const displaySeconds = isOpen ? remainingSeconds : goalSeconds;
  const displayProgress = isOpen ? progress : 0;
  const ringCirc = 2 * Math.PI * 110;

  // Ultra-smooth progress: interpolate continuously between per-second updates
  const progressMV = useMotionValue(displayProgress);
  useEffect(() => {
    progressMV.set(displayProgress);
  }, [displayProgress, progressMV]);
  const smoothProgress = useSpring(progressMV, {
    stiffness: 120,
    damping: 26,
    mass: 0.6,
    restDelta: 0.0001,
  });
  const dashOffset = useTransform(smoothProgress, (p) => ringCirc * (1 - p));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const initials = (data?.profile.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="px-6 pt-12 animate-thunk">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <h1 className="font-display text-2xl font-extrabold mt-0.5">
            {greeting}, {(data?.profile.full_name || "there").split(" ")[0]}
          </h1>
        </div>
        <Link
          to="/profile"
          className="size-11 rounded-full bg-white border border-border flex items-center justify-center font-bold text-xs active:scale-95 transition-transform"
        >
          {initials || "·"}
        </Link>
      </div>

      {/* Ring + Button */}
      <div className="relative flex items-center justify-center py-4">
        <svg width="260" height="260" viewBox="0 0 260 260" className="rotate-[-90deg]">
          <circle cx="130" cy="130" r="110" fill="none" stroke="hsl(240 6% 10% / 0.06)" strokeWidth="22" />
          <motion.circle
            cx="130"
            cy="130"
            r="110"
            fill="none"
            stroke="hsl(217 91% 54%)"
            strokeWidth="22"
            strokeLinecap="round"
            strokeDasharray={ringCirc}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>

        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          disabled={punching}
          onClick={() => (isOpen ? punchOutMut.mutate() : punchInMut.mutate())}
          className="absolute size-32 rounded-full bg-white border border-border flex flex-col items-center justify-center"
          style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.1), inset 0 -4px 0 rgba(0,0,0,0.05)" }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 360 : 0 }}
            transition={{ duration: 2.4, repeat: isOpen ? Infinity : 0, ease: "easeInOut" }}
            className="mb-1.5 text-primary"
          >
            <Hourglass className="size-4" />
          </motion.div>
          <span className="font-display text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {punching ? "Working…" : isOpen ? "Punch Out" : "Punch In"}
          </span>
          <span className="font-display text-2xl font-extrabold mt-0.5 tracking-tight tabular-nums">
            {fmt(displaySeconds)}
          </span>
          <span className="font-display text-[9px] font-medium text-muted-foreground mt-0.5">
            {displaySeconds === 0 ? "Goal reached" : isOpen ? "left out of 8h" : "8h goal"}
          </span>
        </motion.button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-muted-foreground"
        >
          <MapPin className="size-3" />
          {data?.open?.in_lat
            ? `Location tagged · ${data.open.in_lat.toFixed(3)}, ${data.open.in_lng?.toFixed(3)}`
            : "Location skipped"}
        </motion.div>
      )}

      <Link
        to="/calendar"
        className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-white border border-border active:scale-[0.98] transition-transform"
      >
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <CalendarDays className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-extrabold tracking-tight">Attendance calendar</p>
          <p className="text-[11px] text-muted-foreground font-medium">See your month at a glance</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </div>
  );
}

function WeekStrip({ week }: { week: { net_seconds: number | null; punch_in_at: string }[] }) {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const buckets = days.map((d) => {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const total = week
      .filter((r) => {
        const t = new Date(r.punch_in_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      })
      .reduce((acc, r) => acc + (r.net_seconds ?? 0), 0);
    return { date: d, hours: total / 3600 };
  });
  const max = Math.max(8, ...buckets.map((b) => b.hours));
  const total = buckets.reduce((a, b) => a + b.hours, 0);
  const todayIdx = 6;

  return (
    <div className="mt-6 p-5 rounded-3xl bg-white border border-border">
      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">This week</p>
          <p className="font-display text-xl font-extrabold mt-0.5">{total.toFixed(1)}h</p>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">/ 48.0h</p>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {buckets.map((b, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-14 w-full bg-muted rounded-lg flex items-end justify-center overflow-hidden">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(100, (b.hours / max) * 100)}%` }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.32, 0.72, 0, 1.1] }}
                className={`w-full rounded-md ${i === todayIdx ? "bg-primary" : "bg-foreground/70"}`}
              />
            </div>
            <span className={`mt-1 text-[10px] font-bold ${i === todayIdx ? "text-primary" : "text-muted-foreground"}`}>
              {b.date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}