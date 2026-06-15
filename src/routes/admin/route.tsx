import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Home, Users, FileText, CalendarOff, Clock, ArrowLeft, Hourglass, Laptop, Receipt } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { gsap } from "gsap";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

const nav = [
  { to: "/admin/home", label: "Home", icon: Home },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/reports", label: "Work reports", icon: FileText },
  { to: "/admin/leave", label: "Leave", icon: CalendarOff },
  { to: "/admin/wfh", label: "WFH requests", icon: Laptop },
  { to: "/admin/expenses", label: "Expenses", icon: Receipt },
  { to: "/admin/attendance", label: "Attendance", icon: Clock },
];

function AdminLayout() {
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!navRef.current) return;
    gsap.from(navRef.current.querySelectorAll(".sidebar-nav-item"), {
      x: -16, opacity: 0, stagger: 0.05,
      ease: "power2.out", duration: 0.4, clearProps: "all",
    });
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      <Toaster position="top-center" />

      {/* Sidebar — lavender tint */}
      <aside
        ref={navRef}
        className="hidden md:flex w-64 shrink-0 flex-col border-r border-border"
        style={{ background: "hsl(245 30% 97%)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border flex items-center gap-3">
          <div
            className="size-8 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
          >
            <Hourglass className="size-4" />
          </div>
          <div>
            <p className="font-display text-base font-extrabold tracking-tight">FlowAttendance</p>
            <p className="text-[10px] text-muted-foreground font-medium">Admin Dashboard</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-white border border-border shadow-sm border-l-[3px] border-l-primary text-primary"
                    : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <Link
            to="/"
            className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all border border-transparent hover:border-border"
          >
            <ArrowLeft className="size-4" />
            Switch to Employee View
          </Link>
        </div>
      </aside>

      {/* Mobile top bar — lavender tint */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-30 border-b border-border flex items-center gap-1 px-2 py-2 overflow-x-auto no-scrollbar"
        style={{ background: "hsl(245 30% 97%)" }}
      >
        {nav.map((n) => {
          const active = location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                active
                  ? "bg-white shadow-sm text-primary border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
