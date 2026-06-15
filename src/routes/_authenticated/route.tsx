import { createFileRoute, Outlet, redirect, useLocation, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Calendar, User, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { useRef, useEffect } from "react";
import gsap from "gsap";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!getCurrentUser()) throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

function NavTab({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  exact: boolean;
}) {
  const location = useLocation();
  const active = exact
    ? location.pathname === to
    : location.pathname.startsWith(to);
  const iconRef = useRef<SVGSVGElement | null>(null);
  const prevActiveRef = useRef(active);

  // GSAP bounce on becoming active
  useEffect(() => {
    if (active && !prevActiveRef.current && iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0.7, rotate: -10 },
        { scale: 1, rotate: 0, duration: 0.45, ease: "back.out(2.2)" }
      );
    }
    prevActiveRef.current = active;
  }, [active]);

  return (
    <Link
      to={to}
      className="relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl"
    >
      {active && (
        <motion.div
          layoutId="tab-pill"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, oklch(0.58 0.22 264), oklch(0.68 0.18 298))",
            boxShadow: "0 2px 14px oklch(0.65 0.22 264 / 0.45)",
          }}
        />
      )}
      <Icon
        ref={iconRef}
        className={`relative size-5 ${active ? "text-white" : "text-muted-foreground"}`}
        strokeWidth={2.2}
      />
      <span
        className={`relative text-[10px] font-bold uppercase tracking-wider ${active ? "text-white" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </Link>
  );
}

function AppShell() {
  const location = useLocation();

  const tabs = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/report", label: "Report", icon: FileText, exact: false },
    { to: "/leave", label: "Leave", icon: Calendar, exact: false },
    { to: "/profile", label: "Me", icon: User, exact: false },
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-[440px] mx-auto relative">
      <Toaster position="top-center" />
      <main className="flex-1 pb-28 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1.1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating nav bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div
          className="pointer-events-auto rounded-3xl px-2 py-2 flex items-center justify-around"
          style={{
            background: "oklch(0.13 0.028 264 / 0.85)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid oklch(1 0 0 / 0.08)",
            boxShadow: "0 8px 32px oklch(0 0 0 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.06)",
          }}
        >
          {tabs.map((t) => (
            <NavTab key={t.to} {...t} />
          ))}
        </div>
      </nav>
    </div>
  );
}