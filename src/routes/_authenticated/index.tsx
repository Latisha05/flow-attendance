import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MapPin, Hourglass, CalendarDays, ChevronRight, FileText, CalendarOff, Home as HomeIcon, Receipt } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getDashboard, punchIn, punchOut } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { gsap } from "gsap";

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
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data } = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => getDashboard(userId),
    refetchOnWindowFocus: true,
  });

  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);

  // GSAP refs for page entrance
  const headerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.set(headerRef.current, { y: -16, opacity: 0 });
    gsap.set(ringRef.current, { scale: 0.92, opacity: 0 });
    if (cardsRef.current?.children) gsap.set(cardsRef.current.children, { y: 14, opacity: 0 });

    const tl = gsap.timeline();
    tl.to(headerRef.current, { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" })
      .to(ringRef.current, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.4)" }, "-=0.2")
      .to(cardsRef.current?.children ?? [], {
        y: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: "power2.out",
      }, "-=0.15");

    return () => { tl.kill(); };
  }, []);

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
      return punchIn(userId, geo.lat, geo.lng);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", userId] });
      toast.success("Punched in");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const punchOutMut = useMutation({
    mutationFn: async () => {
      if (!data?.open) throw new Error("No active punch");
      return punchOut(userId, data.open.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", userId] });
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

  const progressMV = useMotionValue(displayProgress);
  useEffect(() => { progressMV.set(displayProgress); }, [displayProgress, progressMV]);
  const smoothProgress = useSpring(progressMV, {
    stiffness: 120, damping: 26, mass: 0.6, restDelta: 0.0001,
  });
  const dashOffset = useTransform(smoothProgress, (p) => ringCirc * (1 - p));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const fullName = user?.full_name ?? "";
  const initials = fullName
    .split(" ").filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase()).join("");

  return (
    <div className="px-6 pt-12">
      {/* Header */}
      <div ref={headerRef} className="flex justify-between items-center mb-8">
        <div>
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </span>
          <h1 className="font-display text-2xl font-extrabold mt-2">
            {greeting}, {(fullName || "there").split(" ")[0]}
          </h1>
          {(user?.designation || user?.team) && (
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {user?.designation || "Employee"}
              {user?.team ? ` · ${user.team}` : ""}
            </p>
          )}
        </div>
        <Link
          to="/profile"
          className="size-11 rounded-2xl flex items-center justify-center font-bold text-xs text-white active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))", boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}
        >
          {initials || "·"}
        </Link>
      </div>

      {/* Ring + Button */}
      <div ref={ringRef} className="relative flex items-center justify-center py-4">
        <svg width="260" height="260" viewBox="0 0 260 260" className="rotate-[-90deg]">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(243 75% 59%)" />
              <stop offset="100%" stopColor="hsl(258 80% 68%)" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle cx="130" cy="130" r="110" fill="none" stroke="hsl(240 25% 93%)" strokeWidth="20" />
          {/* Progress arc */}
          <motion.circle
            cx="130" cy="130" r="110" fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={ringCirc}
            style={{
              strokeDashoffset: dashOffset,
              filter: isOpen ? "drop-shadow(0 0 10px rgba(79,70,229,0.4))" : "none",
            }}
          />
        </svg>

        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          disabled={punching}
          onClick={() => (isOpen ? punchOutMut.mutate() : punchInMut.mutate())}
          className="absolute size-32 rounded-full bg-white flex flex-col items-center justify-center border border-border"
          style={{
            boxShadow: isOpen
              ? "0 0 0 0 rgba(79,70,229,0.2), 0 20px 50px rgba(79,70,229,0.15), inset 0 -3px 0 rgba(0,0,0,0.04)"
              : "0 20px 50px rgba(0,0,0,0.08), inset 0 -3px 0 rgba(0,0,0,0.04)",
          }}
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
          <span className="font-display text-2xl font-extrabold mt-0.5 tracking-tight tabular-nums text-foreground">
            {fmt(displaySeconds)}
          </span>
          <span className="font-display text-[9px] font-medium text-muted-foreground mt-0.5">
            {displaySeconds === 0 ? "Goal reached 🎉" : isOpen ? "left of 8h" : "8h goal"}
          </span>
        </motion.button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-center justify-center gap-1.5"
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/8 px-3 py-1 rounded-full">
            <MapPin className="size-3" />
            {data?.open?.in_lat
              ? `Location tagged · ${data.open.in_lat.toFixed(3)}, ${data.open.in_lng?.toFixed(3)}`
              : "Location skipped"}
          </span>
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-4 gap-2.5">
        {[
          { to: "/report", label: "Report", icon: FileText },
          { to: "/leave", label: "Leave", icon: CalendarOff },
          { to: "/wfh", label: "WFH", icon: HomeIcon },
          { to: "/expenses", label: "Expenses", icon: Receipt },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.to}
              to={q.to}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-border hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Icon className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground">{q.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom cards */}
      <div ref={cardsRef} className="mt-6 space-y-3">
        <Link
          to="/calendar"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98] border-l-4 border-l-primary"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
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
    </div>
  );
}
