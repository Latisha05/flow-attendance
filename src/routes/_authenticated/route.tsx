import { createFileRoute, Outlet, redirect, useLocation, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Calendar, Users, User, FileText } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isSupabaseConfigured) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

function AppShell() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    });
  }, []);

  const tabs = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/report", label: "Report", icon: FileText, exact: false },
    { to: "/leave", label: "Leave", icon: Calendar, exact: false },
    ...(isAdmin ? [{ to: "/team", label: "Team", icon: Users, exact: false }] : []),
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

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-6 pb-6 pt-2 pointer-events-none">
        <div className="pointer-events-auto bg-white/85 backdrop-blur-xl border border-border rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-2 py-2 flex items-center justify-around">
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
                    className="absolute inset-0 bg-foreground rounded-2xl"
                  />
                )}
                <Icon
                  className={`relative size-5 ${active ? "text-background" : "text-muted-foreground"}`}
                  strokeWidth={2.2}
                />
                <span
                  className={`relative text-[10px] font-bold uppercase tracking-wider ${active ? "text-background" : "text-muted-foreground"}`}
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