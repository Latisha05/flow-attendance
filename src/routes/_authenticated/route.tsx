import { createFileRoute, Outlet, redirect, useLocation, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Calendar, User, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!getCurrentUser()) throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

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
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-5 pb-6 pt-2 pointer-events-none">
        <div
          className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-border rounded-3xl px-2 py-2 flex items-center justify-around"
          style={{
            boxShadow: "0 -1px 0 rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {tabs.map((t) => {
            const active = t.exact
              ? location.pathname === t.to
              : location.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl"
              >
                {active && (
                  <motion.div
                    layoutId="tab-pill"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
                  />
                )}
                <motion.div whileTap={{ scale: 0.82 }} className="relative">
                  <Icon
                    className={`size-5 ${active ? "text-white" : "text-muted-foreground"}`}
                    strokeWidth={2.2}
                  />
                </motion.div>
                <span
                  className={`relative text-[10px] font-bold uppercase tracking-wider ${active ? "text-white" : "text-muted-foreground"}`}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}