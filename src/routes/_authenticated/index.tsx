import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MapPin, CalendarDays, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getDashboard, punchIn, punchOut } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import gsap from "gsap";

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

  // GSAP refs
  const glowRef = useRef<SVGCircleElement | null>(null);
  const glowTweenRef = useRef<gsap.core.Tween | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const chipRef = useRef<HTMLDivElement | null>(null);

  // Animate glow pulse when punched in
  useEffect(() => {
    if (!glowRef.current) return;
    if (glowTweenRef.current) {
      glowTweenRef.current.kill();
      glowTweenRef.current = null;
    }
    if (data?.open) {
      glowTweenRef.current = gsap.to(glowRef.current, {
        opacity: 0.3,
        repeat: -1,
        yoyo: true,
        duration: 2,
        ease: "sine.inOut",
      });
    } else {
      gsap.set(glowRef.current, { opacity: 0 });
    }
    return () => { glowTweenRef.current?.kill(); };
  }, [!!data?.open]);

  // Animate location chip in
  useLayoutEffect(() => {
    if (chipRef.current && data?.open) {
      gsap.fromTo(chipRef.current,
        { x: -12, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [!!data?.open]);

  const punchInMut = useMutation({
    mutationFn: async () => {
      const geo = await tryGeo();
      return punchIn(userId, geo.lat, geo.lng);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", userId] });
      toast.success("Punched in! Have a great day 🚀");
      // GSAP celebration — ring flash
      if (buttonRef.current) {
        gsap.timeline()
          .to(buttonRef.current, { scale: 0.93, duration: 0.12, ease: "power2.in" })
          .to(buttonRef.current, { scale: 1.04, duration: 0.2, ease: "back.out(2)" })
          .to(buttonRef.current, { scale: 1, duration: 0.25, ease: "power2.out" });
      }
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
      toast.success("Punched out! Great work today ✓");
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

  // Ultra-smooth progress spring
  const progressMV = useMotionValue(displayProgress);
  useEffect(() => { progressMV.set(displayProgress); }, [displayProgress, progressMV]);
  const smoothProgress = useSpring(progressMV, { stiffness: 120, damping: 26, mass: 0.6, restDelta: 0.0001 });
  const dashOffset = useTransform(smoothProgress, (p) => ringCirc * (1 - p));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const fullName = user?.full_name ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const gradientId = "ringGradient";
  const glowFilterId = "ringGlow";

  return (
    <div className="px-6 pt-12 animate-thunk">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <h1 className="font-display text-2xl font-extrabold mt-0.5">
            {greeting}, {(fullName || "there").split(" ")[0]}
          </h1>
        </div>

        {/* Avatar with gradient ring */}
        <Link to="/profile" className="relative flex items-center justify-center">
          <div className="ring-gradient p-[2px] rounded-full">
            <div className="size-11 rounded-full bg-card flex items-center justify-center font-bold text-xs active:scale-95 transition-transform">
              {initials || "·"}
            </div>
          </div>
          {/* Online indicator when punched in */}
          {isOpen && (
            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-400 border-2 border-background pulse-dot" />
          )}
        </Link>
      </div>

      {/* Ring + Button */}
      <div className="relative flex items-center justify-center py-4">
        <svg
          width="260"
          height="260"
          viewBox="0 0 260 260"
          className="rotate-[-90deg]"
          style={{ filter: isOpen ? "drop-shadow(0 0 18px oklch(0.65 0.22 264 / 0.45))" : "none", transition: "filter 1s ease" }}
        >
          <defs>
            {/* Gradient for the ring stroke */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.65 0.22 264)" />
              <stop offset="50%" stopColor="oklch(0.72 0.18 298)" />
              <stop offset="100%" stopColor="oklch(0.65 0.22 264)" />
            </linearGradient>
            {/* Glow filter */}
            <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 1  0 0 0 0.8 0" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track ring */}
          <circle
            cx="130" cy="130" r="110"
            fill="none"
            stroke="oklch(1 0 0 / 0.06)"
            strokeWidth="22"
          />

          {/* Ambient glow layer (GSAP-controlled opacity) */}
          <circle
            ref={glowRef}
            cx="130" cy="130" r="110"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="28"
            strokeLinecap="round"
            strokeDasharray={ringCirc}
            strokeDashoffset={ringCirc * (1 - displayProgress)}
            style={{ opacity: 0, filter: "blur(8px)" }}
          />

          {/* Progress ring */}
          <motion.circle
            cx="130" cy="130" r="110"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="22"
            strokeLinecap="round"
            strokeDasharray={ringCirc}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>

        {/* Center button — glassmorphism */}
        <button
          ref={buttonRef}
          disabled={punching}
          onClick={() => (isOpen ? punchOutMut.mutate() : punchInMut.mutate())}
          className="absolute size-32 rounded-full flex flex-col items-center justify-center cursor-pointer disabled:opacity-60 transition-opacity active:scale-95"
          style={{
            background: "oklch(1 0 0 / 0.06)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid oklch(1 0 0 / 0.12)",
            boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.1), 0 24px 48px oklch(0 0 0 / 0.4)",
          }}
        >
          {/* Hourglass icon */}
          <motion.div
            animate={{ rotate: isOpen ? 360 : 0 }}
            transition={{ duration: 2.4, repeat: isOpen ? Infinity : 0, ease: "easeInOut" }}
            className="mb-1.5 text-primary"
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M5 22h14" /><path d="M5 2h14" />
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
            </svg>
          </motion.div>
          <span className="font-display text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {punching ? "Working…" : isOpen ? "Punch Out" : "Punch In"}
          </span>
          <span className="font-display text-2xl font-extrabold mt-0.5 tracking-tight tabular-nums">
            {fmt(displaySeconds)}
          </span>
          <span className="font-display text-[9px] font-medium text-muted-foreground mt-0.5">
            {displaySeconds === 0 ? "Goal reached 🎉" : isOpen ? "left out of 8h" : "8h goal"}
          </span>
        </button>
      </div>

      {/* Location chip — animated in by GSAP */}
      {isOpen && (
        <div
          ref={chipRef}
          className="mt-4 flex items-center justify-center gap-2"
          style={{ opacity: 0 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{
              background: "oklch(0.7 0.2 162 / 0.12)",
              color: "oklch(0.72 0.18 162)",
              border: "1px solid oklch(0.7 0.2 162 / 0.25)",
            }}
          >
            <MapPin className="size-3" />
            {data?.open?.in_lat
              ? `Location tagged · ${data.open.in_lat.toFixed(3)}, ${data.open.in_lng?.toFixed(3)}`
              : "Location skipped"}
          </span>
        </div>
      )}

      {/* Week strip */}
      {data?.week && data.week.length > 0 && (
        <WeekStrip week={data.week} />
      )}

      {/* Calendar CTA card */}
      <Link
        to="/calendar"
        className="mt-4 flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform card-hero-border"
        style={{
          background: "oklch(1 0 0 / 0.04)",
          border: "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
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
  const barsRef = useRef<HTMLDivElement[]>([]);

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

  // GSAP stagger bar entrance
  useLayoutEffect(() => {
    const bars = barsRef.current.filter(Boolean);
    if (!bars.length) return;
    gsap.from(bars, {
      scaleY: 0,
      transformOrigin: "bottom",
      duration: 0.55,
      stagger: 0.05,
      ease: "expo.out",
      delay: 0.15,
    });
  }, []);

  return (
    <div className="mt-4 p-5 rounded-3xl card-hero-border" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
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
            <div className="h-14 w-full rounded-lg flex items-end justify-center overflow-hidden"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            >
              <div
                ref={(el) => { if (el) barsRef.current[i] = el; }}
                className="w-full rounded-md"
                style={{
                  height: `${Math.min(100, (b.hours / max) * 100)}%`,
                  background: i === todayIdx
                    ? "linear-gradient(to top, oklch(0.65 0.22 264), oklch(0.72 0.18 298))"
                    : "oklch(1 0 0 / 0.25)",
                  boxShadow: i === todayIdx ? "0 0 8px oklch(0.65 0.22 264 / 0.5)" : "none",
                }}
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